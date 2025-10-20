# Configuration

This directory contains centralized configuration for the application.

## API Configuration (`api.ts`)

The `api.ts` file is the **single source of truth** for the API base URL:

- **Base URL**: Centralized API base URL with environment variable support
- **Simple and focused**: Only handles the base URL, endpoints remain in their respective stores

### Usage

```typescript
import { API_BASE_URL } from "../config/api";

// Use the base URL with your existing endpoint patterns
const response = await fetch(`${API_BASE_URL}/users`);
const response = await fetch(`${API_BASE_URL}/tweets/${tweetId}/like`);
```

### Environment Variables

- `EXPO_PUBLIC_API_URL`: Override the default API URL (defaults to `http://localhost:3000`)

### Benefits

1. **Single source of truth**: Base URL defined in one place
2. **Easy maintenance**: Change API URL in one file
3. **Environment flexibility**: Easy to switch between dev/staging/prod
4. **Consistency**: All files use the same base URL
5. **Non-intrusive**: Keeps existing endpoint patterns in stores

### Migration

All stores and services have been updated to use this centralized base URL. No more scattered `localhost:3000` or `localhost:8080` strings throughout the codebase!
