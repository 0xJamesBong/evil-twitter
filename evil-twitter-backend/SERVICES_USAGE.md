# Services Directory Usage Guide

## Overview

The `services/` directory provides a business logic layer that abstracts database operations. Instead of accessing MongoDB collections directly in your GraphQL handlers, you use service methods.

## Structure

```
services/
├── mod.rs                    # Main services module
└── mongo_service/
    ├── mod.rs               # MongoDB services module
    ├── tweet_service.rs     # Tweet-related operations
    └── user_service.rs      # User-related operations
```

## How Services Work

1. **Services are added to AppState** - They're initialized once and shared across all handlers
2. **Services wrap database operations** - They provide clean, reusable methods for common operations
3. **Services can be extended** - Add new methods as needed without changing the database structure

## Usage in GraphQL Handlers

### Before (Direct DB Access):

```rust
async fn tweet_create_resolver(ctx: &Context<'_>, input: TweetCreateInput) -> Result<TweetPayload> {
    let state = ctx.data::<GraphQLState>()?;
    let tweet_collection: Collection<Tweet> = state.db.collection("tweets");
    let user_collection: Collection<User> = state.db.collection("users");

    // Direct database operations...
    tweet_collection.insert_one(&tweet).await?;
}
```

### After (Using Services):

```rust
async fn tweet_create_resolver(ctx: &Context<'_>, input: TweetCreateInput) -> Result<TweetPayload> {
    let state = ctx.data::<GraphQLState>()?;

    // Use services instead
    let tweet = state.tweet_service.create_tweet(tweet).await?;
    let user = state.user_service.get_user_by_id(user_id).await?;
}
```

## Accessing Services in GraphQL

Services are available through `AppState` (which is wrapped in `GraphQLState`):

```rust
let state = ctx.data::<GraphQLState>()?;
let tweet = state.tweet_service.get_tweet_by_id(id).await?;
let user = state.user_service.get_user_by_supabase_id(&supabase_id).await?;
```

## Adding New Services

1. Create a new service file in `services/mongo_service/`:

   ```rust
   // services/mongo_service/follow_service.rs
   pub struct FollowService {
       db: Database,
   }

   impl FollowService {
       pub fn new(db: Database) -> Self {
           Self { db }
       }

       pub async fn follow_user(&self, ...) -> Result<...> {
           // Implementation
       }
   }
   ```

2. Export it in `services/mongo_service/mod.rs`:

   ```rust
   pub mod follow_service;
   pub use follow_service::FollowService;
   ```

3. Add it to `AppState` in `app_state.rs`:

   ```rust
   pub struct AppState {
       pub db: Database,
       pub tweet_service: Arc<TweetService>,
       pub user_service: Arc<UserService>,
       pub follow_service: Arc<FollowService>,  // Add this
   }

   impl AppState {
       pub fn new(db: Database) -> Self {
           Self {
               db: db.clone(),
               tweet_service: Arc::new(TweetService::new(db.clone())),
               user_service: Arc::new(UserService::new(db.clone())),
               follow_service: Arc::new(FollowService::new(db)),  // Add this
           }
       }
   }
   ```

## Benefits

1. **Separation of Concerns** - Business logic is separated from database access
2. **Reusability** - Service methods can be used across multiple handlers
3. **Testability** - Services can be easily mocked for testing
4. **Maintainability** - Database schema changes only affect service implementations
5. **Type Safety** - Services provide strongly-typed interfaces

## Example: Refactoring a Handler

### Original:

```rust
pub async fn tweet_create_resolver(
    ctx: &Context<'_>,
    input: TweetCreateInput,
) -> Result<TweetPayload> {
    let state = ctx.data::<GraphQLState>()?;
    let tweet_collection: Collection<Tweet> = state.db.collection("tweets");
    let user_collection: Collection<User> = state.db.collection("users");

    let user = get_authenticated_user_from_ctx(ctx).await?;

    let tweet = Tweet { /* ... */ };
    tweet_collection.insert_one(&tweet).await?;

    Ok(TweetPayload { tweet })
}
```

### Refactored:

```rust
pub async fn tweet_create_resolver(
    ctx: &Context<'_>,
    input: TweetCreateInput,
) -> Result<TweetPayload> {
    let state = ctx.data::<GraphQLState>()?;

    let user = get_authenticated_user_from_ctx(ctx).await?;

    let tweet = Tweet { /* ... */ };
    let created_tweet = state.tweet_service.create_tweet(tweet).await?;

    Ok(TweetPayload { tweet: created_tweet })
}
```

## Next Steps

1. Gradually refactor existing handlers to use services
2. Add more services as needed (FollowService, LikeService, etc.)
3. Consider adding caching, validation, or other cross-cutting concerns to services
