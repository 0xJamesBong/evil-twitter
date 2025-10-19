# 😈 Evil Twitter - Expo App

A React Native Expo app that replicates the full functionality of the evil-twitter-frontend Next.js app.

## Features

- **Tweets**: Create, view, retweet, quote, and reply to tweets
- **Weapons System**: Buy weapons from the shop and use them to attack/heal tweets
- **User Profiles**: View user stats, weapons, and profile information
- **Real-time Updates**: Zustand state management for reactive UI
- **Dark Theme**: Beautiful dark theme optimized for mobile

## Tech Stack

- **React Native** with Expo
- **React Native Paper** for UI components
- **Zustand** for state management
- **Supabase** for authentication
- **TypeScript** for type safety

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env.local
```

3. Configure your environment variables:

```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_API_URL=http://localhost:3000
```

4. Start the development server:

```bash
npm run web
# or
npm run ios
# or
npm run android
```

## Project Structure

```
app/
├── (tabs)/
│   ├── index.tsx      # Home/Timeline screen
│   ├── shop.tsx       # Weapon shop screen
│   └── profile.tsx    # User profile screen
└── _layout.tsx        # Root layout with providers

components/
├── ComposeTweet.tsx   # Tweet composition component
├── Timeline.tsx       # Timeline display component
└── TweetCard.tsx      # Individual tweet card component

lib/
├── services/
│   └── api.ts         # API service layer
├── stores/
│   ├── authStore.ts           # Authentication state
│   ├── backendUserStore.ts    # Backend user data
│   ├── tweetsStore.ts         # Tweets state management
│   ├── weaponsStore.ts        # User weapons
│   ├── shopStore.ts           # Shop catalog and purchases
│   └── composeStore.ts        # Tweet composition state
└── supabase.ts        # Supabase client configuration
```

## Key Features Implemented

### 🏠 Home Screen

- Timeline of all tweets
- Compose new tweets
- Tweet interactions (like, retweet, quote, reply)
- Health bars for tweets
- Weapon attack/heal functionality

### 🛒 Shop Screen

- Weapon catalog with categories
- Rarity-based color coding
- Purchase weapons with user's money
- Filter by category (All, Weapon, Defensive, Healing, Utility)

### 👤 Profile Screen

- User information and stats
- Arsenal display (owned weapons)
- Follower/following counts
- Dollar rate display

### ⚔️ Weapons System

- 30+ predefined weapons in catalog
- Different categories and rarities
- Attack and heal capabilities
- Health degradation on use

## Emoji Icons

All icons are implemented using emojis instead of icon libraries:

- 🏠 Home
- 🛒 Shop
- 👤 Profile
- ✍️ Compose
- 🔍 Search
- ⚙️ Settings
- ⚔️ Attack
- 💚 Heal
- 💬 Reply
- 🔄 Retweet
- ❤️ Like

## State Management

Uses Zustand for clean, simple state management:

- **authStore**: Supabase authentication
- **backendUserStore**: User profile data
- **tweetsStore**: Tweet data and actions
- **weaponsStore**: User's weapon inventory
- **shopStore**: Shop catalog and purchases
- **composeStore**: Tweet composition state

## API Integration

Connects to the same backend as the Next.js frontend:

- Tweet CRUD operations
- User management
- Weapon catalog and purchases
- Attack/heal functionality

## Development

The app is designed to work seamlessly with the existing evil-twitter backend. Make sure your backend is running on `http://localhost:3000` (or update the API URL in your environment variables).

## Mobile-First Design

Optimized for mobile devices with:

- Touch-friendly interactions
- Responsive layouts
- Native feel with React Native Paper
- Smooth animations and transitions
