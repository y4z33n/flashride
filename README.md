# FlashRide - Mauritius Carpooling MVP

A carpooling application built with React Native (Expo), TypeScript, Zustand, and Supabase.

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

#### Deliverables Completed:
- ✅ Git repository initialized
- ✅ Expo app with TypeScript created
- ✅ Expo Router installed with route groups:
  - `/(auth)` → login, otp, profile-setup
  - `/(app)` → tabs: Home, Search, OfferRide, Inbox, Profile
- ✅ Zustand stores created:
  - `authStore` - session, user, auth state
  - `rideStore` - rides, requests
  - `uiStore` - loading, errors, toasts

#### How to Test Step 1:
1. Run `npm start`
2. Open app on device/simulator
3. Verify navigation works:
   - Should see Login screen (placeholder)
   - After login (Step 3), will navigate to Home tab
4. Test tab navigation between all 5 tabs (currently placeholders)

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

## Environment Variables (Step 2)

Will need:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```
