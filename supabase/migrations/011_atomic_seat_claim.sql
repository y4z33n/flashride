-- ============================================================
-- FlashRide: Migration 011 — Atomic Seat Claiming RPC
--
-- Problem: The existing handle_seat_count() trigger is NOT atomic.
-- Two concurrent riders can both read seats_available = 1, both
-- pass the check, and both get a seat — overselling the ride.
--
-- Solution: A single Postgres function that:
--   1. Locks the ride row (FOR UPDATE) — blocks concurrent calls
--   2. Validates all preconditions inside the same transaction
--   3. Creates the ride_request OR accepts an existing pending one
--   4. Decrements seats_available atomically
--   5. Returns a typed result — never silently fails
--
-- The Node endpoint calls this via supabase.rpc('claim_seat', {...})
-- The old trigger still handles cancellations/rejections (seat refunds).
--
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ixjpeduqymfxdxsflfik/sql/new
-- ============================================================


-- ============================================================
-- SECTION 1: DROP OLD TRIGGER (replaced by atomic RPC)
-- The trigger handled seat DECREMENT on accept.
-- From now on the RPC handles the full claim atomically.
-- The trigger still handles seat REFUND on cancel/reject — keep that part.
-- ============================================================

-- Replace the trigger function: keep only the refund logic, remove the
-- accept logic (the RPC now owns that path).
CREATE OR REPLACE FUNCTION handle_seat_count()
RETURNS TRIGGER AS $$
BEGIN
  -- REFUND: when an accepted request is cancelled or rejected, give seats back
  IF OLD.status = 'accepted' AND NEW.status IN ('cancelled', 'rejected') THEN
    UPDATE public.rides
    SET
      seats_available = seats_available + NEW.seats_requested,
      status = CASE
        WHEN status = 'full' AND (seats_available + NEW.seats_requested) > 0 THEN 'open'
        ELSE status
      END
    WHERE id = NEW.ride_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger stays — it still fires on UPDATE for refund path.
-- (It no longer fires on INSERT because claim_seat handles that.)


-- ============================================================
-- SECTION 2: ATOMIC SEAT CLAIM FUNCTION
-- Called by Node via: supabase.rpc('claim_seat', { p_ride_id, p_rider_id, p_seats })
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_seat(
  p_ride_id   UUID,
  p_rider_id  UUID,
  p_seats     INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- runs as postgres superuser, bypasses RLS for this operation
AS $$
DECLARE
  v_ride          public.rides%ROWTYPE;
  v_existing_req  public.ride_requests%ROWTYPE;
  v_new_req_id    UUID;
  v_result        JSONB;
BEGIN

  -- ── Step 1: Lock the ride row ──────────────────────────────────────
  -- FOR UPDATE acquires a row-level lock.
  -- Any concurrent call to claim_seat for the same ride_id will BLOCK
  -- here until this transaction commits or rolls back.
  SELECT * INTO v_ride
  FROM public.rides
  WHERE id = p_ride_id
  FOR UPDATE;

  -- ── Step 2: Validate ride exists ──────────────────────────────────
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code',    'RIDE_NOT_FOUND',
      'message', 'Ride does not exist.'
    );
  END IF;

  -- ── Step 3: Validate ride is open ─────────────────────────────────
  IF v_ride.status NOT IN ('open', 'full') THEN
    RETURN jsonb_build_object(
      'success', false,
      'code',    'RIDE_NOT_OPEN',
      'message', 'This ride is not accepting requests (' || v_ride.status || ').'
    );
  END IF;

  -- ── Step 4: Validate rider is not the driver ───────────────────────
  IF v_ride.driver_id = p_rider_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'code',    'DRIVER_CANNOT_REQUEST',
      'message', 'The driver cannot request their own ride.'
    );
  END IF;

  -- ── Step 5: Validate seats requested ──────────────────────────────
  IF p_seats < 1 OR p_seats > 4 THEN
    RETURN jsonb_build_object(
      'success', false,
      'code',    'INVALID_SEATS',
      'message', 'Seats requested must be between 1 and 4.'
    );
  END IF;

  -- ── Step 6: Check if rider already has a request for this ride ────
  SELECT * INTO v_existing_req
  FROM public.ride_requests
  WHERE ride_id = p_ride_id
    AND rider_id = p_rider_id;

  IF FOUND THEN
    IF v_existing_req.status = 'accepted' THEN
      RETURN jsonb_build_object(
        'success', false,
        'code',    'ALREADY_ACCEPTED',
        'message', 'You already have an accepted seat on this ride.'
      );
    END IF;

    IF v_existing_req.status = 'pending' THEN
      RETURN jsonb_build_object(
        'success', false,
        'code',    'REQUEST_PENDING',
        'message', 'You already have a pending request for this ride.'
      );
    END IF;
    -- If status is 'rejected' or 'cancelled', allow re-request below
  END IF;

  -- ── Step 7: Check seat availability ───────────────────────────────
  IF v_ride.seats_available < p_seats THEN
    RETURN jsonb_build_object(
      'success',         false,
      'code',            'NO_SEATS',
      'message',         'Not enough seats available.',
      'seats_available', v_ride.seats_available
    );
  END IF;

  -- ── Step 8: Create or re-create the request ────────────────────────
  -- At this point the lock is held, seats are available, all checks passed.
  IF FOUND AND v_existing_req.status IN ('rejected', 'cancelled') THEN
    -- Reuse the existing row, reset to pending
    UPDATE public.ride_requests
    SET status          = 'pending',
        seats_requested = p_seats,
        updated_at      = NOW()
    WHERE id = v_existing_req.id
    RETURNING id INTO v_new_req_id;
  ELSE
    -- Insert fresh request
    INSERT INTO public.ride_requests (ride_id, rider_id, seats_requested, status)
    VALUES (p_ride_id, p_rider_id, p_seats, 'pending')
    RETURNING id INTO v_new_req_id;
  END IF;

  -- ── Step 9: Build success result ───────────────────────────────────
  -- Note: we do NOT decrement seats_available here.
  -- Seats are only decremented when the DRIVER accepts the request.
  -- This function creates a PENDING request atomically (no duplicates).
  v_result := jsonb_build_object(
    'success',     true,
    'code',        'REQUEST_CREATED',
    'message',     'Ride request submitted successfully.',
    'request_id',  v_new_req_id,
    'ride_id',     p_ride_id,
    'seats',       p_seats
  );

  RETURN v_result;

END;
$$;


-- ============================================================
-- SECTION 3: ATOMIC ACCEPT FUNCTION
-- Called by Node when driver accepts a request.
-- Atomically: validates → decrements seats → updates request status.
-- ============================================================

CREATE OR REPLACE FUNCTION public.accept_ride_request(
  p_request_id UUID,
  p_driver_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request   public.ride_requests%ROWTYPE;
  v_ride      public.rides%ROWTYPE;
BEGIN

  -- ── Step 1: Lock the request row ──────────────────────────────────
  SELECT * INTO v_request
  FROM public.ride_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code',    'REQUEST_NOT_FOUND',
      'message', 'Request does not exist.'
    );
  END IF;

  -- ── Step 2: Check request is still pending ────────────────────────
  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code',    'REQUEST_NOT_PENDING',
      'message', 'Request is no longer pending (' || v_request.status || ').'
    );
  END IF;

  -- ── Step 3: Lock the ride row ─────────────────────────────────────
  SELECT * INTO v_ride
  FROM public.rides
  WHERE id = v_request.ride_id
  FOR UPDATE;

  -- ── Step 4: Validate caller is the driver ─────────────────────────
  IF v_ride.driver_id != p_driver_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'code',    'NOT_DRIVER',
      'message', 'Only the driver can accept requests.'
    );
  END IF;

  -- ── Step 5: Validate ride is still open ───────────────────────────
  IF v_ride.status NOT IN ('open', 'full') THEN
    RETURN jsonb_build_object(
      'success', false,
      'code',    'RIDE_NOT_OPEN',
      'message', 'This ride is no longer accepting requests.'
    );
  END IF;

  -- ── Step 6: Validate seats available ──────────────────────────────
  IF v_ride.seats_available < v_request.seats_requested THEN
    RETURN jsonb_build_object(
      'success',         false,
      'code',            'NO_SEATS',
      'message',         'Not enough seats available.',
      'seats_available', v_ride.seats_available
    );
  END IF;

  -- ── Step 7: Accept — all checks passed, commit atomically ─────────
  UPDATE public.ride_requests
  SET status     = 'accepted',
      updated_at = NOW()
  WHERE id = p_request_id;

  UPDATE public.rides
  SET
    seats_available = seats_available - v_request.seats_requested,
    status = CASE
      WHEN (seats_available - v_request.seats_requested) <= 0 THEN 'full'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = v_ride.id;

  RETURN jsonb_build_object(
    'success',    true,
    'code',       'REQUEST_ACCEPTED',
    'message',    'Request accepted.',
    'request_id', p_request_id,
    'ride_id',    v_ride.id
  );

END;
$$;


-- ============================================================
-- SECTION 4: GRANT EXECUTE to authenticated users
-- The function runs as SECURITY DEFINER (postgres), but we still
-- need to grant EXECUTE so authenticated users can call it via RPC.
-- ============================================================

GRANT EXECUTE ON FUNCTION public.claim_seat(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_ride_request(UUID, UUID) TO authenticated;


-- ============================================================
-- SECTION 5: TEST QUERIES (run manually after applying)
-- ============================================================

-- Test: call claim_seat with a real ride_id and user_id
-- SELECT public.claim_seat(
--   'your-ride-uuid-here'::UUID,
--   'your-user-uuid-here'::UUID,
--   1
-- );

-- Expected results:
-- Valid call on open ride with seats → { "success": true, "code": "REQUEST_CREATED", ... }
-- Same call again (duplicate)        → { "success": false, "code": "REQUEST_PENDING", ... }
-- Call on full ride                   → { "success": false, "code": "NO_SEATS", ... }
-- Driver calling own ride             → { "success": false, "code": "DRIVER_CANNOT_REQUEST", ... }
