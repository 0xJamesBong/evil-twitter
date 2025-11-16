# Architecture Overview

## Harmonized Service and Schema Structure

The codebase now has a clean, harmonized structure where services and database access work together seamlessly.

## Key Components

### 1. AppState (`src/app_state.rs`)

The central application state that contains:

- **`db: Database`** - Direct MongoDB database access (for backward compatibility and schema building)
- **Services** - Business logic layer (TweetService, UserService, etc.)

```rust
pub struct AppState {
    pub db: Database,                    // Direct DB access
    pub tweet_service: Arc<TweetService>,  // Tweet operations
    pub user_service: Arc<UserService>,    // User operations
}
```

### 2. GraphQLState (`src/graphql/mod.rs`)

The GraphQL context state that wraps AppState:

- **`app_state: Arc<AppState>`** - Full access to services and database
- **`db: Database`** - Direct database access (for backward compatibility with existing code)

```rust
pub struct GraphQLState {
    pub app_state: Arc<AppState>,  // Use this for services
    pub db: Database,              // Use this for direct DB access (backward compat)
}
```

### 3. Schema Building (`src/graphql/schema.rs`)

The schema is built with AppState, which is then wrapped in GraphQLState:

```rust
pub fn build_schema(app_state: Arc<AppState>) -> AppSchema {
    Schema::build(...)
        .data(GraphQLState::new(app_state.clone()))
        .finish()
}
```

## Usage Patterns

### In GraphQL Handlers

**Option 1: Use Services (Recommended)**

```rust
let state = ctx.data::<GraphQLState>()?;
let tweet = state.app_state.tweet_service.get_tweet_by_id(id).await?;
let user = state.app_state.user_service.get_user_by_id(user_id).await?;
```

**Option 2: Direct Database Access (Backward Compatible)**

```rust
let state = ctx.data::<GraphQLState>()?;
let collection: Collection<Tweet> = state.db.collection("tweets");
// ... use collection directly
```

### In Main (`src/main.rs`)

```rust
let client = Client::with_uri_str(&mongo_uri).await?;
let db = client.database(&mongo_db);
let app_state = Arc::new(AppState::new(db));  // Services are created here
```

## Benefits

1. **Backward Compatibility** - Existing code using `state.db` continues to work
2. **Forward Compatibility** - New code can use services for cleaner abstractions
3. **Gradual Migration** - You can migrate handlers one at a time to use services
4. **Single Source of Truth** - AppState is created once and shared everywhere

## Migration Path

1. **Keep using `state.db`** for now - it works!
2. **Gradually migrate** to services as you refactor handlers
3. **New code** should prefer services over direct DB access

## Example: Migrating a Handler

**Before:**

```rust
let state = ctx.data::<GraphQLState>()?;
let collection: Collection<Tweet> = state.db.collection("tweets");
let tweet = collection.find_one(doc! { "_id": id }).await?;
```

**After:**

```rust
let state = ctx.data::<GraphQLState>()?;
let tweet = state.app_state.tweet_service.get_tweet_by_id(id).await?;
```

Both approaches work, but services provide better abstraction and reusability.
