# GraphQL vs REST Strategy for Evil Twitter

## Current state analysis

### REST endpoints (30+)

- Users: create, get, list, balances, dollar-rate operations
- Tweets: create, get, list, thread, wall, like, smack, support, attack, retweet, quote, reply
- Follows: follow, unfollow, status, followers list, following list
- Shop: catalog, buy, assets
- Exchange: prices, exchange
- Admin: data generation, migrations

### Data fetching patterns

- Profile page: 4–5 separate calls (user + balances + tweets + weapons + follow status)
- Tweet threads: already optimized with hydration
- Timeline: single call with author snapshots
- Complex relationships: author snapshots, quoted tweets, reply chains

---

## Recommended strategy: hybrid approach

### Use GraphQL for

#### 1. Profile/composite reads

Why: Profile pages require multiple related entities.

Current REST calls:

```
GET /users/{id}              → User data
GET /users/{id}/balances     → Token balances
GET /users/{id}/wall         → User tweets
GET /users/{id}/assets       → Weapons/items
GET /users/{id}/follow-status → Follow relationship
```

GraphQL query:

```graphql
query Profile($userId: ID!, $viewerId: ID) {
  user(id: $userId) {
    id
    username
    displayName
    bio
    avatarUrl
    followersCount
    followingCount
    tweetsCount
    dollarConversionRate

    balances {
      dooler
      usdc
      bling
      sol
    }

    assets {
      id
      name
      type
      health
      damage
    }

    tweets(first: 20) {
      edges {
        node {
          id
          content
          metrics {
            likes
            smacks
            retweets
          }
          energyState {
            energy
          }
        }
      }
    }

    isFollowedBy(viewerId: $viewerId)
  }
}
```

Benefit: 1 query instead of 5, with client-controlled fields.

---

#### 2. User discovery and search

Why: Flexible filtering and sorting.

GraphQL queries:

```graphql
query SearchUsers($query: String!, $filters: UserFilters) {
  searchUsers(query: $query, filters: $filters) {
    id
    username
    displayName
    avatarUrl
    followersCount
    isFollowedBy(viewerId: $viewerId)
    latestTweet {
      id
      content
      metrics {
        likes
      }
    }
  }
}

query DiscoverUsers($filters: DiscoverFilters) {
  discoverUsers(filters: $filters) {
    id
    username
    displayName
    stats {
      tweetsCount
      followersCount
    }
    mutualFollows(viewerId: $viewerId)
  }
}
```

Benefit: Flexible queries without new REST endpoints.

---

#### 3. Tweet relationships and threads

Why: Nested relationships fit GraphQL.

Current: `/tweets/{id}/thread` returns parents + target + replies (already good)

GraphQL enhancement:

```graphql
query TweetThread($tweetId: ID!, $includeMetrics: Boolean = true) {
  tweet(id: $tweetId) {
    id
    content
    author { username, displayName, avatarUrl }
    metrics @include(if: $includeMetrics) { likes, smacks, retweets }
    energyState { energy, kineticEnergy, potentialEnergy }

    quotedTweet {
      id
      content
      author { username }
    }

    repliedToTweet {
      id
      content
      author { username }
    }

    parents {
      id
      content
      author { username }
      parents { ... } # Recursive
    }

    replies(first: 10) {
      edges {
        node {
          id
          content
          author { username }
          replies(first: 5) { ... } # Nested replies
        }
      }
    }
  }
}
```

Benefit: Client controls depth and fields.

---

#### 4. Dashboard/analytics views

Why: Aggregated data from multiple sources.

```graphql
query Dashboard($userId: ID!) {
  user(id: $userId) {
    stats {
      totalTweets
      totalLikes
      totalSmacks
      averageEnergy
      topWeapons {
        name
        usageCount
      }
    }

    recentActivity {
      tweets {
        id
        content
        createdAt
      }
      interactions {
        type
        count
      }
    }

    tokenSummary {
      balances {
        dooler
        usdc
        bling
        sol
      }
      recentTransactions {
        type
        amount
        timestamp
      }
    }
  }
}
```

---

### Keep REST for

#### 1. All mutations (writes)

Why: Clear, auditable, idempotent, easy to rate limit.

Keep as REST:

- `POST /tweets` - Create tweet
- `POST /tweets/{id}/like` - Like tweet
- `POST /tweets/{id}/smack` - Smack tweet
- `POST /tweets/{id}/support` - Support with weapon
- `POST /tweets/{id}/attack` - Attack with weapon
- `POST /users/{id}/follow` - Follow user
- `DELETE /users/{id}/follow` - Unfollow user
- `POST /shop/{user_id}/buy` - Purchase item
- `POST /exchange` - Exchange tokens

Reason: REST mutations are explicit, cacheable (GET), and align with HTTP semantics.

---

#### 2. Timeline feeds

Why: Server-controlled pagination, ranking, caching.

Keep as REST:

- `GET /tweets` - Main timeline
- `GET /users/{id}/wall` - User wall

Reason: Server controls shape, pagination, and ranking. GraphQL can add complexity without clear benefit.

Enhancement: Add cursor pagination if not already present:

```
GET /tweets?cursor=abc123&limit=20
GET /users/{id}/wall?cursor=xyz789&limit=20
```

---

#### 3. Real-time updates

Why: WebSocket/SSE are better for real-time.

Keep as WebSocket/SSE:

- Live notifications
- Real-time tweet updates
- Live energy changes
- Bid updates (if marketplace)

Reason: GraphQL subscriptions add complexity; WebSocket/SSE are simpler for real-time.

---

#### 4. File uploads

Why: REST is standard for multipart/form-data.

Keep as REST:

- `POST /upload/avatar` - Avatar upload
- `POST /upload/media` - Tweet media upload

---

#### 5. Admin/operational endpoints

Why: Internal, not client-facing.

Keep as REST:

- `POST /data/generate` - Generate fake data
- `DELETE /data/clear` - Clear all data
- `POST /admin/migrate-*` - Migration endpoints

---

## Implementation plan

### Phase 1: GraphQL foundation (Week 1–2)

1. Add GraphQL server (async-graphql or juniper for Rust)
2. Define core types: `User`, `Tweet`, `TokenBalance`, `Asset`
3. Implement profile query (replace 5 REST calls)
4. Add dataloaders for N+1 prevention

### Phase 2: Expand GraphQL queries (Week 3–4)

1. User search/discovery
2. Enhanced tweet thread queries
3. Dashboard/analytics queries
4. Add query complexity limits

### Phase 3: Frontend integration (Week 5–6)

1. Add GraphQL client (Apollo/Urql) to Next.js and Expo
2. Migrate profile pages to GraphQL
3. Keep REST for mutations
4. Add query caching

### Phase 4: Optimization (Week 7–8)

1. Add persisted queries
2. Implement response caching
3. Add query cost analysis
4. Monitor and optimize slow queries

---

## Technical recommendations

### GraphQL server choice

- Option 1: async-graphql (Rust) — type-safe, performant
- Option 2: Apollo Server (Node.js BFF) — mature, good tooling

Recommendation: async-graphql in Rust for consistency.

### Dataloaders

- User dataloader: batch user fetches
- Tweet dataloader: batch tweet fetches
- Balance dataloader: batch balance fetches

### Security

- Query depth limit: max 10
- Query complexity limit: max 1000
- Rate limiting per user
- Field-level auth (hide sensitive data)

### Caching strategy

- REST: HTTP cache headers (ETag, Cache-Control)
- GraphQL: Response caching for safe queries
- Client: Normalized cache (Apollo/Urql)

---

## Migration checklist

### Immediate (GraphQL)

- [ ] Profile page composite query
- [ ] User search/discovery
- [ ] Enhanced tweet thread queries

### Keep REST

- [ ] All mutations (like, smack, follow, etc.)
- [ ] Timeline feeds
- [ ] File uploads
- [ ] Admin endpoints
- [ ] Real-time (WebSocket/SSE)

### Future consideration

- [ ] GraphQL subscriptions (if real-time needs grow)
- [ ] Federation (if microservices split)

---

## Expected benefits

### GraphQL adoption

- Profile page: 5 calls → 1 call (80% reduction)
- User search: Flexible queries without new endpoints
- Better developer experience: Self-documenting schema
- Type safety: Shared schema across Rust/TypeScript

### REST retention

- Simple mutations: Clear, auditable
- Timeline performance: Server-optimized
- Real-time: WebSocket/SSE simplicity
- File uploads: Standard REST patterns

---

## Summary

Use GraphQL for:

- Complex reads (profiles, search, relationships)
- Client-driven field selection
- Reducing round trips

Keep REST for:

- All mutations
- Timeline feeds
- Real-time updates
- File uploads
- Admin operations

This hybrid approach balances flexibility and performance while keeping mutations simple and auditable.

Short answer: yes—use GraphQL for reads (threads, replies, quotes, profiles) and REST for writes (like/smack/send-reply). That’s a solid default. To make “numbers jump immediately” after a write, harmonize them at three layers:

# 1) API shape

- **GraphQL (reads):** Cursor-based connections for feeds; denormalized “viewerState” fields for each object (e.g., `likedByViewer`, `smackedByViewer`, `canSmack`).
- **REST (writes):** Small, idempotent endpoints with idempotency keys.

  - `POST /likes { tweetId, idempotencyKey } → { status, newLikeCount, version }`
  - `POST /smacks { tweetId, amount, idempotencyKey } → { status, newSmackTotal, version }`

- **Gateway/BFF:** Expose **GraphQL mutations that proxy to those REST writes** so clients can stay GraphQL-only if you want:

  ```graphql
  type Mutation {
    likeTweet(id: ID!, idempotencyKey: String!): LikeResult!
  }
  type LikeResult {
    status: String!
    newLikeCount: Int!
    version: String!
  }
  ```

# 2) Immediate UX sync

1. **Optimistic UI**

   - Apollo:

     ```ts
     mutate({
       variables: { id, idempotencyKey },
       optimisticResponse: {
         likeTweet: {
           status: "OK",
           newLikeCount: current + 1,
           version: "temp",
           __typename: "LikeResult",
         },
       },
       update(cache, { data }) {
         cache.modify({
           id: cache.identify({ __typename: "Tweet", id }),
           fields: {
             likeCount(c = 0) {
               return data?.likeTweet?.newLikeCount ?? c;
             },
             likedByViewer() {
               return true;
             },
           },
         });
       },
     });
     ```

   - Relay: use `optimisticUpdater` / `updater` to bump `likeCount` and `viewerState`.

2. **Real-time reconciliation**
   Choose one:

   - **GraphQL Subscriptions (WebSocket)** publishing `LikeCountUpdated`/`SmackTotalUpdated` events.
   - **SSE** channel per timeline/tweet.
   - **Short TTL re-query** for the mutated node (e.g., refetch the tweet after 3–5s as a fallback).

3. **Conflict handling**

   - Include a **monotonic `version`** (or vector clock) from the write response and from live events. Only apply updates with `version >= cachedVersion`.
   - If the optimistic bump is wrong (rate-limited, already liked), **revert** from the authoritative event/response.

# 3) Backend consistency (so the numbers are right)

- **CQRS/Event-sourcing pattern (lightweight):**

  - REST write → **append event** (`LikeAdded{tweetId, userId}`) to a log/queue.
  - A **counter materializer** (Redis/Scylla/ClickHouse) updates `likeCount`, `smackTotal`, etc., and publishes a **fan-out event** for subscriptions.

- **Counters service:** keep hot counts in Redis with atomic ops; periodically backfill to DB.
- **Idempotency** on writes: `Idempotency-Key` header to make likes/smacks safe on retries.
- **Authorization parity:** same JWT/Scopes for both GraphQL and REST; normalize error shapes at the gateway (e.g., map REST errors to GraphQL `extensions.code`).

# Practical rules of thumb

- **Reads:** GraphQL wins—one roundtrip, tailor fields per view, easy caching/normalization, Relay connections for pagination.
- **Writes:** Keep REST—simple, fast, idempotent; also expose **GraphQL mutations that call those REST endpoints** so clients can stay in GraphQL and still get normalized cache updates.
- **Instant counters:** Optimistic UI + real-time event → reconcile by version. Don’t wait for the read model to rebuild to make the number jump.

# Minimal schema & endpoints to copy

```graphql
type Tweet {
  id: ID!
  text: String!
  likeCount: Int!
  smackTotal: Int!
  viewerState: ViewerState!
}
type ViewerState {
  liked: Boolean!
  smacked: Boolean!
}

type Subscription {
  tweetMetricsUpdated(id: ID!): TweetMetrics!
}
type TweetMetrics {
  id: ID!
  likeCount: Int!
  smackTotal: Int!
  version: String!
}
```

```
POST /likes
Body: { tweetId, idempotencyKey }
→ { status:"OK", newLikeCount, version }

POST /smacks
Body: { tweetId, amount, idempotencyKey }
→ { status:"OK", newSmackTotal, version }
```

This gives you:

- GraphQL for all fetching + cache normalization.
- REST for actions (also callable via GraphQL mutations in the gateway).
- Immediate UI via optimistic updates, then confirmed via subscription/SSE with versioned reconciliation.
