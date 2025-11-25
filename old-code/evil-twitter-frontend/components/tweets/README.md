# Tweet Components

This directory contains all tweet-related components with a unified, reusable architecture.

## Architecture

### Core Components

1. **`TweetContent.tsx`** - Base component for rendering tweet content

   - Shared logic for displaying tweets in different contexts
   - Supports variants: `full`, `compact`, `quoted`
   - Handles avatar, header, content, media display
   - Flexible rendering through props

2. **`QuotedTweetCard.tsx`** - Wrapper for quoted tweets

   - Uses `TweetContent` with `variant="quoted"`
   - Adds bordered card styling
   - Used when displaying quoted tweets within other tweets

3. **`TweetCard.tsx`** - Full interactive tweet card
   - Main component for displaying tweets in timeline
   - Includes all interactive features (like, retweet, quote, reply)
   - Shows health system, tweet type indicators, and tweet ID
   - Uses the shared components for consistency

## Usage

```typescript
// Import from index
import { TweetCard, QuotedTweetCard, TweetContent } from "./tweets";

// Or import individually
import { TweetCard } from "./tweets/TweetCard";
import { QuotedTweetCard } from "./tweets/QuotedTweetCard";
import { TweetContent } from "./tweets/TweetContent";
```

## Benefits

- **DRY Principle**: Shared rendering logic eliminates code duplication
- **Consistency**: All tweet displays use the same base components
- **Maintainability**: Changes to tweet display logic happen in one place
- **Flexibility**: Different variants for different contexts
- **Type Safety**: Shared `TweetData` interface ensures consistency

## Data Flow

```
TweetData (interface)
    ↓
TweetContent (base component)
    ↓
├─→ QuotedTweetCard (compact variant in bordered card)
│
└─→ TweetCard (full variant with interactions)
```
