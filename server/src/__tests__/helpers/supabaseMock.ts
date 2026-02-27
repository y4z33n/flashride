/**
 * helpers/supabaseMock.ts
 * ─────────────────────────────────────────────────────────────────────
 * A fluent chainable mock for @supabase/supabase-js that mirrors the
 * real client's builder pattern: .from().select().eq().single() etc.
 *
 * Usage in a test file:
 *
 *   import { mockSupabase, setMockResponse } from '../helpers/supabaseMock';
 *   jest.mock('../../lib/supabase', () => mockSupabase);
 *
 *   setMockResponse({ data: { id: '...', ... }, error: null });
 */

export type MockResponse = { data: unknown; error: unknown; count?: number | null };

let _response: MockResponse = { data: null, error: null };

/** Set what the next Supabase call returns. */
export function setMockResponse(r: MockResponse) {
  _response = r;
}

/** Reset to default (null/null). */
export function resetMockResponse() {
  _response = { data: null, error: null };
}

/** A mock RPC that always succeeds. Override per-test with setMockResponse. */
const rpcMock = jest.fn().mockImplementation(() => Promise.resolve(_response));

/** Builder chain — every method returns `this` so chains resolve to the mock. */
function makeChain(): any {
  const chain: any = {};

  // Methods that return `this` for further chaining
  const chainMethods = [
    'select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'or', 'in', 'is', 'filter', 'order', 'limit', 'range', 'ilike',
  ];
  for (const m of chainMethods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }

  // Methods that resolve the promise (with the current _response)
  const terminalMethods = ['single', 'maybeSingle'];
  for (const m of terminalMethods) {
    chain[m] = jest.fn().mockImplementation(() => Promise.resolve(_response));
  }

  // insert / update / upsert / delete return a chain (so .select().single() works after them)
  chain.insert = jest.fn().mockReturnValue(chain);
  chain.update = jest.fn().mockReturnValue(chain);
  chain.upsert = jest.fn().mockReturnValue(chain);
  chain.delete = jest.fn().mockReturnValue(chain);

  // Make the chain itself awaitable (for `await supabase.from('x').select(...)` patterns)
  chain.then = (resolve: (v: MockResponse) => unknown) =>
    Promise.resolve(_response).then(resolve);

  return chain;
}

export const mockSupabase = {
  supabaseAdmin: {
    from:  jest.fn().mockImplementation(() => makeChain()),
    rpc:   rpcMock,
    auth: {
      getUser: jest.fn(),
    },
    storage: {
      from: jest.fn().mockReturnThis(),
    },
  },
  // Some services call createUserClient(token) — return same shape
  createUserClient: jest.fn().mockReturnValue({
    from: jest.fn().mockImplementation(() => makeChain()),
    auth: { getUser: jest.fn() },
  }),
};
