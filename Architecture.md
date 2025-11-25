# Backend-Frontend-Smart Contract Integration Plan

## Architecture Principle

**THE ONE RULE**: All user-initiated state-changing actions go through the backend. All view-only operations read from the backend cache/index. The frontend NEVER speaks directly to the blockchain (except deposit/withdraw which are user-signed).

## Data Flow

```
Frontend (UI) → Backend (Business Logic + TX Signing) → Solana Program (Settlement)
     ↓                                                           ↓
  Deposit/Withdraw (user-signed)                    Backend reads chain state
```

## Phase 1: Backend Solana Integration Setup

### 1.1 Add Solana Dependencies

**File**: `evil-twitter-backend/Cargo.toml`

- Add `anchor-client = "0.30"` (or latest compatible version)
- Add `solana-client = "1.18"` (or latest)
- Add `solana-sdk = "1.18"` (or latest)
- Add `bs58 = "0.5"` for base58 encoding

### 1.2 Environment Configuration

**File**: `evil-twitter-backend/.env` (or environment variables)

- `SOLANA_RPC_URL` - RPC endpoint (default: `http://localhost:8899` for localnet)
- `SOLANA_NETWORK` - Network (localnet/devnet/mainnet)
- `SOLANA_PROGRAM_ID` - Program ID (`4z5rjroGdWmgGX13SdFsh4wRM4jJkMUrcvYrNpV3gezm`)
- `SOLANA_PAYER_KEYPAIR` - Base58-encoded keypair for backend to sign transactions
- `BLING_MINT` - BLING token mint address

### 1.3 Copy IDL to Backend

**File**: `evil-twitter-backend/src/solana/idl/opinions_market.json`

- Copy from `opinions-market/target/idl/opinions_market.json`
- This provides Rust types for the program

## Phase 2: Backend Solana Service Layer

### 2.1 PDA Derivation Utilities

**File**: `evil-twitter-backend/src/solana/pda.rs`

- Functions to derive all PDAs:
  - `get_config_pda(program_id) -> Pubkey`
  - `get_user_account_pda(program_id, user_wallet) -> Pubkey`
  - `get_post_pda(program_id, post_id_hash) -> Pubkey`
  - `get_position_pda(program_id, post_pda, user_wallet) -> Pubkey`
  - `get_post_pot_token_account_pda(program_id, post_pda, token_mint) -> Pubkey`
  - `get_post_pot_authority_pda(program_id, post_pda) -> Pubkey`
  - `get_user_vault_token_account_pda(program_id, user_wallet, token_mint) -> Pubkey`
  - `get_vault_authority_pda(program_id) -> Pubkey`
  - `get_valid_payment_pda(program_id, token_mint) -> Pubkey`
  - `get_protocol_treasury_token_account_pda(program_id, token_mint) -> Pubkey`
  - `get_post_mint_payout_pda(program_id, post_pda, token_mint) -> Pubkey`
  - `get_user_post_mint_claim_pda(program_id, post_pda, token_mint, user_wallet) -> Pubkey`

### 2.2 Solana Connection Service

**File**: `evil-twitter-backend/src/solana/connection.rs`

- `SolanaConnection` struct with:
  - `rpc_url: String`
  - `network: String`
  - `connection: RpcConnection` (lazy-initialized)
- Methods:
  - `new(rpc_url, network) -> Self`
  - `get_connection() -> Result<RpcConnection>`
  - `get_latest_blockhash() -> Result<Hash>`

### 2.3 Program Client Service

**File**: `evil-twitter-backend/src/solana/program.rs`

- `SolanaProgram` struct with:
  - `program_id: Pubkey`
  - `payer: Keypair` (backend signer)
  - `connection: Arc<SolanaConnection>`
  - `program: Program` (Anchor program instance)
- Methods:
  - `new(program_id, payer_keypair, connection) -> Result<Self>`
  - `get_program() -> &Program`
  - `get_payer() -> &Keypair`

### 2.4 Solana Service Module

**File**: `evil-twitter-backend/src/services/solana_service.rs`

- `SolanaService` struct wrapping program client
- Methods for all on-chain operations:
  - `create_user(user_wallet: Pubkey) -> Result<Signature>`
  - `create_post(user_wallet: Pubkey, post_id_hash: [u8; 32], parent_post_pda: Option<Pubkey>) -> Result<Signature>`
  - `vote_on_post(voter_wallet: Pubkey, post_id_hash: [u8; 32], side: Side, votes: u64, token_mint: Pubkey) -> Result<Signature>`
  - `settle_post(post_id_hash: [u8; 32], token_mint: Pubkey) -> Result<Signature>`
  - `claim_post_reward(user_wallet: Pubkey, post_id_hash: [u8; 32], token_mint: Pubkey) -> Result<Signature>`
- Account fetching methods:
  - `get_post_account(post_id_hash: [u8; 32]) -> Result<Option<PostAccount>>`
  - `get_user_account(user_wallet: Pubkey) -> Result<Option<UserAccount>>`
  - `get_user_position(post_id_hash: [u8; 32], user_wallet: Pubkey) -> Result<Option<UserPostPosition>>`
  - `get_user_vault_balance(user_wallet: Pubkey, token_mint: Pubkey) -> Result<u64>`

### 2.5 Add Solana Service to AppState

**File**: `evil-twitter-backend/src/app_state.rs`

- Add `solana_service: Arc<SolanaService>` to `AppState`
- Initialize in `AppState::new()`

## Phase 3: Backend Database Schema Updates

### 3.1 Add post_id_hash to Tweet Model

**File**: `evil-twitter-backend/src/models/tweet.rs`

- Add `post_id_hash: Option<String>` field to `Tweet` struct
  - Store as hex string (64 chars) or base58
  - Generated when tweet is created (32 random bytes)

### 3.2 Add Post State Aggregation Model

**File**: `evil-twitter-backend/src/models/post_state.rs` (new)

- `PostState` struct with:
  - `post_id_hash: String`
  - `post_pda: String` (base58)
  - `state: String` (Open/Settled)
  - `upvotes: u64`
  - `downvotes: u64`
  - `winning_side: Option<String>` (Pump/Smack)
  - `start_time: i64`
  - `end_time: i64`
  - `last_synced_at: DateTime`
- Store in MongoDB collection `post_states`
- Used for fast reads without hitting chain

### 3.3 Update Tweet Service

**File**: `evil-twitter-backend/src/services/mongo_service/tweet_service.rs`

- Modify `create_tweet_with_author()` to:

  1. Generate `post_id_hash` (32 random bytes)
  2. Convert to hex/base58 string
  3. Store with tweet
  4. Return in response

## Phase 4: Backend GraphQL Mutations

### 4.1 Add Post Creation Mutation

**File**: `evil-twitter-backend/src/graphql/tweet/mutations.rs`

- Update `tweet_create_resolver()` to:

  1. Create tweet in MongoDB (with `post_id_hash`)
  2. Extract user's Solana wallet from User model
  3. Call `solana_service.create_post()` with `post_id_hash`
  4. Handle transaction success/failure
  5. Return tweet with `post_id_hash`

### 4.2 Add Vote Mutation

**File**: `evil-twitter-backend/src/graphql/tweet/mutations.rs`

- Add `TweetVoteInput`:
  - `tweet_id: ID`
  - `side: String` ("pump" | "smack")
  - `votes: u64`
  - `token_mint: String` (optional, defaults to BLING)
- Add `tweet_vote()` mutation resolver:

  1. Get tweet by ID, extract `post_id_hash`
  2. Get user's Solana wallet
  3. Validate user has sufficient vault balance
  4. Call `solana_service.vote_on_post()`
  5. Sync post state to MongoDB after vote
  6. Return updated vote counts

### 4.3 Add Claim Reward Mutation

**File**: `evil-twitter-backend/src/graphql/tweet/mutations.rs`

- Add `tweet_claim_reward()` mutation:

  1. Get tweet by ID, extract `post_id_hash`
  2. Get user's Solana wallet
  3. Call `solana_service.claim_post_reward()`
  4. Return success status

## Phase 5: Backend GraphQL Queries

### 5.1 Add Post State to TweetNode

**File**: `evil-twitter-backend/src/graphql/tweet/types.rs`

- Add `PostStateNode` type:
  - `state: String`
  - `upvotes: u64`
  - `downvotes: u64`
  - `winningSide: Option<String>`
  - `endTime: i64`
- Add `postState: Option<PostStateNode>` to `TweetNode`
- Resolver fetches from MongoDB `post_states` collection (fast read)

### 5.2 Add User Vault Balance Query

**File**: `evil-twitter-backend/src/graphql/user/queries.rs`

- Add `vault_balance(token_mint: Option<String>)` to `UserQuery`
- Resolver:

  1. Get user's Solana wallet
  2. Call `solana_service.get_user_vault_balance()`
  3. Return balance

## Phase 6: Backend Chain Sync Service

### 6.1 Post State Sync Service

**File**: `evil-twitter-backend/src/services/post_sync_service.rs` (new)

- `PostSyncService` struct
- Methods:
  - `sync_post_state(post_id_hash: [u8; 32]) -> Result<()>`
    - Fetch `PostAccount` from chain
    - Update MongoDB `post_states` collection
  - `sync_all_posts() -> Result<()>` (for cron job)
- Called after:
  - Vote transactions
  - Settlement transactions
  - Periodically via cron

### 6.2 Settlement Cron Job

**File**: `evil-twitter-backend/src/services/settlement_service.rs` (new)

- Background task that:

  1. Queries MongoDB for posts with `end_time < now` and `state = Open`
  2. For each expired post, call `solana_service.settle_post()` for each token mint
  3. Sync post state after settlement
  4. Run periodically (e.g., every 5 minutes)

## Phase 7: Frontend Deposit/Withdraw (User-Signed)

### 7.1 Solana Utilities (Frontend)

**File**: `privy-template/src/lib/solana/pda.ts`

- PDA derivation functions (same as backend, but in TypeScript)
- Use `@solana/web3.js` `PublicKey.findProgramAddressSync`

**File**: `privy-template/src/lib/solana/program.ts`

- `getProgram(connection, wallet)` - Creates Anchor program instance
- Uses IDL from `src/lib/solana/idl/opinions_market.json`

**File**: `privy-template/src/lib/solana/connection.ts`

- `getConnection()` - Returns Solana Connection based on network

### 7.2 Deposit Hook

**File**: `privy-template/src/hooks/useDeposit.ts`

- `useDeposit()` hook:
  - Takes `amount: number`, `tokenMint: PublicKey`
  - Uses Privy's `useSolanaWallets()` to get active wallet
  - Builds and sends `deposit` transaction
  - User signs transaction (wallet popup)
  - Returns transaction signature

### 7.3 Withdraw Hook

**File**: `privy-template/src/hooks/useWithdraw.ts`

- `useWithdraw()` hook:
  - Takes `amount: number`, `tokenMint: PublicKey`
  - Uses Privy's `useSolanaWallets()` to get active wallet
  - Builds and sends `withdraw` transaction
  - User signs transaction (wallet popup)
  - Returns transaction signature

### 7.4 Deposit/Withdraw UI Components

**File**: `privy-template/src/components/solana/DepositWithdraw.tsx` (new)

- Component for deposit/withdraw actions
- Shows current vault balance (from GraphQL query)
- Input fields for amount and token selection
- Calls `useDeposit`/`useWithdraw` hooks

## Phase 8: Frontend Integration (Backend-Mediated)

### 8.1 Update Tweet Types

**File**: `privy-template/src/lib/graphql/tweets/types.ts`

- Add `postIdHash?: string` to `TweetNode`
- Add `PostStateNode` interface:
  - `state: string`
  - `upvotes: number`
  - `downvotes: number`
  - `winningSide?: string`
  - `endTime: number`
- Add `postState?: PostStateNode` to `TweetNode`

### 8.2 Add Vote Mutation (GraphQL)

**File**: `privy-template/src/lib/graphql/tweets/mutations.ts`

- Add `TWEET_VOTE_MUTATION`:
  ```graphql
  mutation VoteOnTweet($input: TweetVoteInput!) {
    tweetVote(input: $input) {
      upvotes
      downvotes
      state
    }
  }
  ```

### 8.3 Update Tweet Store

**File**: `privy-template/src/lib/stores/tweetStore.ts`

- Add `voteOnTweet()` action:

  1. Call GraphQL `tweetVote` mutation
  2. Backend handles on-chain transaction
  3. Update local state with new vote counts
  4. No wallet popup (backend signs)

### 8.4 Voting UI Component

**File**: `privy-template/src/components/tweets/VoteButtons.tsx` (new)

- Component for Pump/Smack voting
- Shows current vote counts from `postState`
- Input for vote amount
- Calls `tweetStore.voteOnTweet()`
- Shows loading state during backend transaction

### 8.5 Update TweetCard

**File**: `privy-template/src/components/tweets/TweetCard.tsx`

- Add voting buttons (Pump/Smack)
- Display vote counts from `tweet.postState`
- Show post state (Open/Settled)
- Show time remaining until expiration

## Phase 9: Error Handling & Edge Cases

### 9.1 Backend Error Handling

**File**: `evil-twitter-backend/src/solana/errors.rs` (new)

- Map Anchor error codes to user-friendly messages
- Handle transaction failures gracefully
- Return appropriate GraphQL errors

### 9.2 Transaction Status Tracking

**File**: `evil-twitter-backend/src/models/transaction_status.rs` (new)

- Store transaction signatures and status
- Track pending/completed/failed transactions
- Used for debugging and user feedback

### 9.3 Frontend Error Handling

- Show user-friendly error messages for:
  - Insufficient vault balance
  - Post expired
  - Post already settled
  - Transaction failures

## Phase 10: Testing & Validation

### 10.1 Backend Tests

- Test PDA derivations match on-chain
- Test post creation flow
- Test voting flow
- Test settlement flow
- Test error cases

### 10.2 Integration Tests

- Test full flow: create tweet → vote → settle → claim
- Test deposit/withdraw on frontend
- Test backend transaction signing
- Test chain state sync to MongoDB

## Implementation Order

1. **Phase 1-2**: Backend Solana setup and service layer
2. **Phase 3**: Database schema updates
3. **Phase 4**: Backend mutations (create_post, vote)
4. **Phase 5**: Backend queries (post state, vault balance)
5. **Phase 6**: Chain sync service
6. **Phase 7**: Frontend deposit/withdraw (user-signed)
7. **Phase 8**: Frontend voting UI (backend-mediated)
8. **Phase 9**: Error handling
9. **Phase 10**: Testing

## Key Considerations

- **post_id_hash**: Generated by backend when tweet is created (32 random bytes), stored as hex/base58 in MongoDB
- **Wallet Mapping**: Backend maps Privy user ID → Solana wallet address (already stored in User model)
- **Transaction Signing**: Backend uses payer keypair for all transactions except deposit/withdraw
- **State Sync**: MongoDB `post_states` collection caches on-chain state for fast reads
- **Settlement**: Cron job automatically settles expired posts
- **Error Recovery**: Failed transactions are logged and can be retried
