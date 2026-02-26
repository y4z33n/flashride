# FlashRide — Mauritius Carpooling MVP

A full-stack carpooling app built with React Native (Expo), TypeScript, Zustand, and Supabase. Designed for a single corridor closed beta in Mauritius.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + Expo SDK 54 + TypeScript |
| Navigation | Expo Router (file-based) |
| State | Zustand |
| Backend / DB | Supabase (Postgres + Auth + Realtime + Storage) |
| Maps | Google Maps (`react-native-maps`) |
| Location | `expo-location` |
| Push Notifications | `expo-notifications` (dev/prod builds only) |
| Error Tracking | Custom logger → Supabase `error_logs` table |
| Builds | EAS Build (Expo Application Services) |

---

## Features

- ✅ Email auth + profile setup (driver / rider toggle)
- ✅ Offer a ride (origin, destination, time, seats, price)
- ✅ Search rides with filters
- ✅ Request / Accept / Reject flow (realtime)
- ✅ Group chat per ride (realtime)
- ✅ Live driver location sharing → rider map
- ✅ Ride completion + star ratings
- ✅ Push notifications (request, accept, reject)
- ✅ Profile screen with stats and review history
- ✅ Ride history (driver + rider)
- ✅ Error tracking (prod only)

---

## Project Structure

```
app/
  (auth)/         # login, register, profile-setup
  (app)/          # main tab screens
    ride/         # ride detail + live map
    chat/         # group chat
lib/
  api.ts          # Supabase service methods
  supabase.ts     # Supabase client
  notifications.ts
  errorTracking.ts
  types.ts
store/
  authStore.ts
  rideStore.ts
shims/            # Web stubs for native-only packages
supabase/
  migrations/     # All DB migrations (run in order)
```

---

## Development Setup

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Expo Go on your device (limited — no push notifications)

### Install & Run

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go. Press `w` for web.

### Environment Variables

Create a `.env` file:

```
EXPO_PUBLIC_SUPABASE_URL=https://ixjpeduqymfxdxsflfik.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
```

---

## Database Migrations

Run these **in order** in the Supabase SQL Editor:

| File | Description |
|------|-------------|
| `001_profiles.sql` | Profiles table + RLS |
| `002_schema.sql` | Rides, requests, messages, ratings, push_tokens |
| `003_messages_rls.sql` | Messages RLS policies |
| `004_location_updates_rls.sql` | Location RLS + REPLICA IDENTITY FULL |
| `005_ride_requests_replica_identity.sql` | Realtime for request status |
| `006_rides_replica_identity.sql` | Realtime for ride status |
| `007_error_logs.sql` | Error logging table |

---

## Building for Beta (EAS)

### 1. Link to EAS

```bash
eas login
eas init
```

Copy the generated `projectId` into `app.json` → `extra.eas.projectId`.

### 2. Add secrets to EAS

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_key"
```

### 3. Build APK (Android internal test)

```bash
# Development build (enables push notifications)
eas build --profile development --platform android

# Preview APK for beta testers
eas build --profile preview --platform android
```

### 4. Install on device

Download the `.apk` from the EAS dashboard and install directly, or share the install link with beta testers.

---

## Push Notifications

> ⚠️ Push notifications require a **dev build** or **production build**. They do NOT work in Expo Go (SDK 53+).

1. Build with `eas build --profile development`
2. Install the dev build on device
3. On first launch, accept the notification permission prompt
4. Token is saved to `push_tokens` table in Supabase

---

## Closed Beta Checklist

### Before launch
- [ ] Run all 7 SQL migrations in Supabase
- [ ] Set `EXPO_PUBLIC_SUPABASE_ANON_KEY` in EAS secrets
- [ ] Build preview APK: `eas build --profile preview --platform android`
- [ ] Test on 2 physical devices (driver + rider accounts)
- [ ] Verify push tokens appear in `push_tokens` table
- [ ] Enable Supabase Realtime on all 4 tables (should already be on)

### Beta scope (single corridor)
- Route: **Port Louis ↔ Ebène** (or your target corridor)
- Max testers: 20–30 users
- Duration: 2 weeks
- Collect feedback via WhatsApp group or Google Form

### Known limitations

| Item | Status |
|------|--------|
| iOS build | Needs Apple Developer account ($99/yr) |
| Push on Expo Go | Not supported (use dev build) |
| Payment integration | Not built (cash-based for MVP) |
| Admin dashboard | Not built |
| In-app SOS / safety | Not built |

---

## Error Monitoring

In production builds, errors are written to `error_logs` table.

View them in Supabase:
```sql
SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 50;
SELECT level, count(*) FROM error_logs GROUP BY level;
```

---

## Git History (Steps)

| Commit | Feature |
|--------|---------|
| Step 1 | Project scaffold, Supabase, auth |
| Step 2 | Profiles + onboarding |
| Step 3 | Offer ride + home screen |
| Step 4 | Search rides |
| Step 5 | Ride requests (accept/reject) |
| Step 6 | Group chat (realtime) |
| Step 7 | Live location sharing |
| Step 8 | Ratings + completed ride flow |
| Step 9 | Push notifications |
| Step 10 | Realtime fixes (REPLICA IDENTITY) |
| Step 11 | Web shims + Expo Go fixes |
| Step 12 | Error tracking + EAS config + beta docs |


## Tech Stack
- **Mobile**: React Native + Expo + TypeScript
- **State**: Zustand
- **Backend/DB**: Supabase (Postgres + Auth + Realtime + Storage)
- **Server**: Node.js (Express)
- **Maps**: Google Maps

## App Identity
- **Name**: FlashRide
- **Bundle ID**: com.flashride.app

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo Go app on your mobile device (for testing)

### Installation

```bash
npm install
```

### Running the App

```bash
npm start
```

Then:
- Press `a` for Android emulator
- Press `i` for iOS simulator (macOS only)
- Scan QR code with Expo Go app on your device

### Current Status

**✅ Step 1 COMPLETE** - Repo + Expo app scaffold
**✅ Step 2 COMPLETE** - Supabase project + connection

#### Step 2 Deliverables Completed:
- ✅ Supabase client installed and configured
- ✅ Environment variables set (.env file)
- ✅ Supabase client with secure session persistence (AsyncStorage)
- ✅ AuthStore updated to use Supabase auth
- ✅ Session viewer screen created for testing
- ✅ Auto session restoration on app reload

#### How to Test Step 2:
1. Run `npm start` and reload app
2. Navigate to **Session** tab (first tab)
3. Click "Test Supabase Connection" button
4. Should see: ✅ Connected to Supabase! (or error message)
5. Check Environment Variables section shows ✅ Set for both vars
6. Session and Profile will show ❌ (auth not implemented yet - that's Step 3)

#### Next Steps:
- **Step 2**: Supabase project setup + connection
- **Step 3**: Auth implementation (email-based)
- **Step 4**: Database schema

## Project Structure

```
flashride/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication flow
│   │   ├── login.tsx
│   │   ├── otp.tsx
│   │   └── profile-setup.tsx
│   ├── (app)/             # Main app (tabs)
│   │   ├── home.tsx       # My rides
│   │   ├── search.tsx     # Find rides
│   │   ├── offer-ride.tsx # Create ride
│   │   ├── inbox.tsx      # Requests & chat
│   │   └── profile.tsx    # User profile
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Entry redirect
├── store/                 # Zustand stores
│   ├── authStore.ts
│   ├── rideStore.ts
│   └── uiStore.ts
├── lib/                   # Utilities (future)
├── components/            # Reusable components (future)
└── assets/               # Images, fonts
```

## Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=https://ixjpeduqymfxdxsflfik.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
```

**✅ Supabase credentials configured**
**⏳ Google Maps API key needed for Step 5**
