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
