use async_graphql::{Context, Enum, ID, Object, Result, SimpleObject};
use hex;
use mongodb::bson::{DateTime, doc};
use std::str::FromStr;
use std::sync::Arc;

use crate::app_state::AppState;
use crate::graphql::user::types::{Language, ProfileNode};
use crate::models::post_state::PostState;
use crate::models::tweet::{TweetMetrics, TweetType, TweetView};
use crate::solana::get_post_pda;
use crate::utils::tweet::{AnswerWithComments, QuestionThreadResponse, TweetThreadResponse};

// ============================================================================
// Connection Types
// ============================================================================

#[derive(SimpleObject, Clone)]
pub struct TweetConnection {
    pub edges: Vec<TweetEdge>,
    pub total_count: i64,
}

#[derive(SimpleObject, Clone)]
pub struct TweetEdge {
    pub cursor: ID,
    pub node: TweetNode,
}

// ============================================================================
// Tweet Node
// ============================================================================

#[derive(Clone)]
pub struct TweetNode {
    view: TweetView,
}

impl From<TweetView> for TweetNode {
    fn from(view: TweetView) -> Self {
        Self { view }
    }
}

#[Object]
impl TweetNode {
    async fn id(&self) -> Option<ID> {
        self.view.tweet.id.map(|id| ID::from(id.to_hex()))
    }

    async fn owner_id(&self) -> ID {
        ID::from(self.view.tweet.owner_id.to_hex())
    }

    async fn content(&self) -> &str {
        &self.view.tweet.content
    }

    /// Get the tweet's script rendering mode for PUA disambiguation
    async fn language(&self) -> Language {
        self.view.tweet.language.into()
    }

    async fn tweet_type(&self) -> TweetTypeOutput {
        TweetTypeOutput::from(self.view.tweet.tweet_type)
    }

    async fn metrics(&self) -> TweetMetricsObject {
        TweetMetricsObject::from(self.view.tweet.metrics.clone())
    }

    async fn energy_state(&self) -> TweetEnergyStateObject {
        TweetEnergyStateObject::from(self.view.tweet.energy_state.clone())
    }

    /// Get the author's profile (fetched on demand)
    async fn author(&self, ctx: &Context<'_>) -> Result<Option<ProfileNode>> {
        let app_state = ctx.data::<Arc<AppState>>()?;

        // Get the user by owner_id
        let user = app_state
            .mongo_service
            .users
            .get_user_by_id(self.view.tweet.owner_id)
            .await?;

        let user = match user {
            Some(u) => u,
            None => return Ok(None),
        };

        // Get the profile by privy_id
        let profile = app_state
            .mongo_service
            .profiles
            .get_profile_by_user_id(&user.privy_id)
            .await?;

        Ok(profile.map(ProfileNode::from))
    }

    async fn quoted_tweet(&self) -> Option<TweetNode> {
        self.view
            .quoted_tweet
            .as_ref()
            .map(|boxed| TweetNode::from((**boxed).clone()))
    }

    async fn replied_to_tweet(&self) -> Option<TweetNode> {
        self.view
            .replied_to_tweet
            .as_ref()
            .map(|boxed| TweetNode::from((**boxed).clone()))
    }

    async fn root_tweet_id(&self) -> Option<ID> {
        self.view
            .tweet
            .root_tweet_id
            .map(|id| ID::from(id.to_hex()))
    }

    async fn quoted_tweet_id(&self) -> Option<ID> {
        self.view
            .tweet
            .quoted_tweet_id
            .map(|id| ID::from(id.to_hex()))
    }

    async fn replied_to_tweet_id(&self) -> Option<ID> {
        self.view
            .tweet
            .replied_to_tweet_id
            .map(|id| ID::from(id.to_hex()))
    }

    async fn updated_at(&self) -> Option<String> {
        self.view
            .tweet
            .updated_at
            .map(|ts| ts.to_chrono().to_rfc3339())
    }

    async fn created_at(&self) -> String {
        self.view.tweet.created_at.to_chrono().to_rfc3339()
    }

    async fn reply_depth(&self) -> i32 {
        self.view.tweet.reply_depth
    }

    /// Get post state from on-chain data (cached in MongoDB, falls back to on-chain fetch)
    async fn post_state(&self, ctx: &Context<'_>) -> Result<Option<PostStateNode>> {
        let app_state = ctx.data::<Arc<AppState>>()?;

        // Only fetch post state if tweet has a post_id_hash
        let post_id_hash = match &self.view.tweet.post_id_hash {
            Some(hash) => hash,
            None => return Ok(None),
        };

        // First, try to fetch from MongoDB post_states collection (cached)
        let post_states_collection: mongodb::Collection<PostState> = app_state
            .mongo_service
            .db()
            .collection(PostState::COLLECTION_NAME);

        let mut post_state = post_states_collection
            .find_one(doc! { "post_id_hash": post_id_hash })
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to fetch post state: {}", e)))?;

        // Check if cached state is stale (older than 5 seconds) and force refresh
        if let Some(ref cached_state) = post_state {
            let now = DateTime::now();
            let cache_age_ms =
                now.timestamp_millis() - cached_state.last_synced_at.timestamp_millis();
            if cache_age_ms > 5000 {
                // Cache is stale (older than 5 seconds), force refresh from on-chain
                eprintln!(
                    "🔄 Cache stale for post {} (age: {}ms), refreshing from on-chain",
                    post_id_hash, cache_age_ms
                );
                post_state = None; // Force refresh
            }
        }

        // If not found in MongoDB or cache is stale, fetch from on-chain
        if post_state.is_none() {
            // Parse post_id_hash from hex to [u8; 32]
            let post_id_hash_bytes = hex::decode(post_id_hash)
                .map_err(|e| async_graphql::Error::new(format!("Invalid post_id_hash: {}", e)))?;

            if post_id_hash_bytes.len() != 32 {
                return Ok(None);
            }

            let mut post_id_hash_array = [0u8; 32];
            post_id_hash_array.copy_from_slice(&post_id_hash_bytes);

            // Derive post PDA
            let program = app_state.solana_service.opinions_market_program();
            let program_id = program.id();
            let (post_pda, _) = get_post_pda(&program_id, &post_id_hash_array);

            // Fetch post account from on-chain
            match program
                .account::<opinions_market::states::PostAccount>(post_pda)
                .await
            {
                Ok(post_account) => {
                    // Convert PostAccount to PostState
                    let state_str = match post_account.state {
                        opinions_market::states::PostState::Open => "Open".to_string(),
                        opinions_market::states::PostState::Settled => "Settled".to_string(),
                    };

                    let winning_side = post_account.winning_side.map(|side| match side {
                        opinions_market::states::Side::Pump => "Pump".to_string(),
                        opinions_market::states::Side::Smack => "Smack".to_string(),
                    });

                    let function = Some(match post_account.function {
                        opinions_market::states::PostFunction::Normal => "Normal".to_string(),
                        opinions_market::states::PostFunction::Question => "Question".to_string(),
                        opinions_market::states::PostFunction::Answer => "Answer".to_string(),
                    });

                    let post_state_doc = PostState {
                        id: None,
                        post_id_hash: post_id_hash.to_string(),
                        post_pda: post_pda.to_string(),
                        state: state_str.clone(),
                        upvotes: post_account.upvotes,
                        downvotes: post_account.downvotes,
                        winning_side: winning_side.clone(),
                        start_time: post_account.start_time,
                        end_time: post_account.end_time,
                        function,
                        last_synced_at: DateTime::now(),
                    };

                    // Save to MongoDB for future queries
                    let _ = post_states_collection.insert_one(&post_state_doc).await; // Don't fail if insert fails, just log

                    post_state = Some(post_state_doc);
                }
                Err(e) => {
                    // Post doesn't exist on-chain yet, return None
                    eprintln!(
                        "⚠️ Post not found on-chain for post_id_hash {}: {}",
                        post_id_hash, e
                    );
                    return Ok(None);
                }
            }
        }

        // Fetch pot balances for the post
        let pot_balances = if post_state.is_some() {
            // Parse post_id_hash from hex to [u8; 32]
            if let Ok(post_id_hash_bytes) = hex::decode(post_id_hash) {
                if post_id_hash_bytes.len() == 32 {
                    let mut post_id_hash_array = [0u8; 32];
                    post_id_hash_array.copy_from_slice(&post_id_hash_bytes);

                    // Get BLING mint
                    let bling_mint = *app_state.solana_service.get_bling_mint();

                    // Get BLING pot balance
                    let bling_balance = app_state
                        .solana_service
                        .get_post_pot_balance(&post_id_hash_array, &bling_mint)
                        .await
                        .unwrap_or(0);

                    // Get USDC and Stablecoin mints from environment
                    let usdc_mint_str = std::env::var("USDC_MINT").ok();
                    let stablecoin_mint_str = std::env::var("STABLECOIN_MINT").ok();

                    // Get USDC pot balance if available
                    let usdc_balance = if let Some(ref usdc_mint_str) = usdc_mint_str {
                        if let Ok(usdc_mint) = solana_sdk::pubkey::Pubkey::from_str(usdc_mint_str) {
                            app_state
                                .solana_service
                                .get_post_pot_balance(&post_id_hash_array, &usdc_mint)
                                .await
                                .ok()
                        } else {
                            None
                        }
                    } else {
                        None
                    };

                    // Get Stablecoin pot balance if available
                    let stablecoin_balance =
                        if let Some(ref stablecoin_mint_str) = stablecoin_mint_str {
                            if let Ok(stablecoin_mint) =
                                solana_sdk::pubkey::Pubkey::from_str(stablecoin_mint_str)
                            {
                                app_state
                                    .solana_service
                                    .get_post_pot_balance(&post_id_hash_array, &stablecoin_mint)
                                    .await
                                    .ok()
                            } else {
                                None
                            }
                        } else {
                            None
                        };

                    Some(PostPotBalances {
                        bling: bling_balance,
                        usdc: usdc_balance,
                        stablecoin: stablecoin_balance,
                    })
                } else {
                    None
                }
            } else {
                None
            }
        } else {
            None
        };

        // Fetch user position if authenticated (optional - don't fail if not authenticated)
        let user_votes = if post_state.is_some() {
            // Try to get authenticated user (optional - don't fail if not authenticated)
            if let Ok(headers) = ctx.data::<axum::http::HeaderMap>() {
                if let Ok(user) = crate::utils::auth::get_authenticated_user(
                    &app_state.mongo_service,
                    &app_state.privy_service,
                    headers,
                )
                .await
                {
                    // Parse user wallet
                    if let Ok(user_wallet) = solana_sdk::pubkey::Pubkey::from_str(&user.wallet) {
                        // Parse post_id_hash
                        if let Ok(post_id_hash_bytes) = hex::decode(post_id_hash) {
                            if post_id_hash_bytes.len() == 32 {
                                let mut post_id_hash_array = [0u8; 32];
                                post_id_hash_array.copy_from_slice(&post_id_hash_bytes);

                                // Fetch user position from on-chain
                                if let Ok(Some(position)) = app_state
                                    .solana_service
                                    .get_user_position(&user_wallet, &post_id_hash_array)
                                    .await
                                {
                                    Some(UserVotes {
                                        upvotes: position.upvotes,
                                        downvotes: position.downvotes,
                                    })
                                } else {
                                    None
                                }
                            } else {
                                None
                            }
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                } else {
                    None
                }
            } else {
                None
            }
        } else {
            None
        };

        // Fetch payout info if post is settled
        let payout_info = if let Some(ref state) = post_state {
            if state.state == "Settled" {
                // Parse post_id_hash
                if let Ok(post_id_hash_bytes) = hex::decode(post_id_hash) {
                    if post_id_hash_bytes.len() == 32 {
                        let mut post_id_hash_array = [0u8; 32];
                        post_id_hash_array.copy_from_slice(&post_id_hash_bytes);

                        // Get BLING mint (default token for payout info)
                        let bling_mint = *app_state.solana_service.get_bling_mint();

                        // Fetch payout account
                        if let Ok(Some(payout)) = app_state
                            .solana_service
                            .get_post_mint_payout(&post_id_hash_array, &bling_mint)
                            .await
                        {
                            Some(PostMintPayoutNode {
                                token_mint: bling_mint.to_string(),
                                frozen: payout.frozen,
                                creator_fee: payout.creator_fee.to_string(),
                                protocol_fee: payout.protocol_fee.to_string(),
                                mother_fee: payout.mother_fee.to_string(),
                                total_payout: payout.total_payout.to_string(),
                            })
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                } else {
                    None
                }
            } else {
                None
            }
        } else {
            None
        };

        Ok(post_state.map(|state| {
            let mut node = PostStateNode::from(state);
            node.pot_balances = pot_balances;
            node.user_votes = user_votes;
            node.payout_info = payout_info;
            node
        }))
    }

    /// Get post ID hash
    async fn post_id_hash(&self) -> Option<String> {
        self.view.tweet.post_id_hash.clone()
    }
}

// ============================================================================
// Enums
// ============================================================================

#[derive(Enum, Copy, Clone, Eq, PartialEq)]
pub enum TweetTypeOutput {
    Original,
    Retweet,
    Quote,
    Reply,
}

impl From<TweetType> for TweetTypeOutput {
    fn from(value: TweetType) -> Self {
        match value {
            TweetType::Original => TweetTypeOutput::Original,
            TweetType::Retweet => TweetTypeOutput::Retweet,
            TweetType::Quote => TweetTypeOutput::Quote,
            TweetType::Reply => TweetTypeOutput::Reply,
        }
    }
}

// ============================================================================
// Post State Node
// ============================================================================

#[derive(SimpleObject, Clone)]
pub struct PostPotBalances {
    /// Pot balance in BLING lamports
    pub bling: u64,
    /// Pot balance in USDC lamports (None if USDC is not registered as valid payment or no votes)
    pub usdc: Option<u64>,
    /// Pot balance in Stablecoin lamports (None if Stablecoin is not registered as valid payment or no votes)
    pub stablecoin: Option<u64>,
}

#[derive(SimpleObject, Clone)]
pub struct PostStateNode {
    pub state: String,
    pub upvotes: u64,
    pub downvotes: u64,
    pub winning_side: Option<String>,
    pub start_time: i64,
    pub end_time: i64,
    /// Post function: "Normal", "Question", or "Answer"
    pub function: Option<String>,
    pub pot_balances: Option<PostPotBalances>,
    /// User's vote counts for this post (None if not authenticated or hasn't voted)
    pub user_votes: Option<UserVotes>,
    /// Payout information if post is settled
    pub payout_info: Option<PostMintPayoutNode>,
}

#[derive(SimpleObject, Clone)]
pub struct UserVotes {
    pub upvotes: u64,
    pub downvotes: u64,
}

impl From<PostState> for PostStateNode {
    fn from(state: PostState) -> Self {
        Self {
            state: state.state,
            upvotes: state.upvotes,
            downvotes: state.downvotes,
            winning_side: state.winning_side,
            start_time: state.start_time,
            end_time: state.end_time,
            function: state.function,
            pot_balances: None, // Will be populated by resolver
            user_votes: None,   // Will be populated by resolver if user is authenticated
            payout_info: None,  // Will be populated by resolver if post is settled
        }
    }
}

// ============================================================================
// Post Mint Payout Node
// ============================================================================

#[derive(SimpleObject, Clone)]
pub struct PostMintPayoutNode {
    pub token_mint: String,
    pub frozen: bool,
    pub creator_fee: String,
    pub protocol_fee: String,
    pub mother_fee: String,
    pub total_payout: String,
}

// ============================================================================
// Object Types
// ============================================================================

#[derive(SimpleObject, Clone)]
pub struct TweetMetricsObject {
    pub likes: i64,
    pub retweets: i64,
    pub quotes: i64,
    pub replies: i64,
    pub impressions: i64,
    pub smacks: i64,
}

impl From<TweetMetrics> for TweetMetricsObject {
    fn from(metrics: TweetMetrics) -> Self {
        Self {
            likes: metrics.likes,
            retweets: metrics.retweets,
            quotes: metrics.quotes,
            replies: metrics.replies,
            impressions: metrics.impressions,
            smacks: metrics.smacks,
        }
    }
}

#[derive(SimpleObject, Clone)]
pub struct TweetEnergyStateObject {
    pub energy: f64,
    pub kinetic_energy: f64,
    pub potential_energy: f64,
    pub energy_gained_from_support: f64,
    pub energy_lost_from_attacks: f64,
    pub mass: f64,
    pub velocity_initial: f64,
    pub height_initial: f64,
}

impl From<crate::models::tweet::TweetEnergyState> for TweetEnergyStateObject {
    fn from(state: crate::models::tweet::TweetEnergyState) -> Self {
        Self {
            energy: state.energy,
            kinetic_energy: state.kinetic_energy,
            potential_energy: state.potential_energy,
            energy_gained_from_support: state.energy_gained_from_support,
            energy_lost_from_attacks: state.energy_lost_from_attacks,
            mass: state.mass,
            velocity_initial: state.velocity_initial,
            height_initial: state.height_initial,
        }
    }
}

// ============================================================================
// Thread Node
// ============================================================================

pub struct TweetThreadNode {
    tweet: TweetNode,
    parents: Vec<TweetNode>,
    replies: Vec<TweetNode>,
}

impl From<TweetThreadResponse> for TweetThreadNode {
    fn from(response: TweetThreadResponse) -> Self {
        let tweet = TweetNode::from(response.tweet);
        let parents = response.parents.into_iter().map(TweetNode::from).collect();
        let replies = response.replies.into_iter().map(TweetNode::from).collect();
        Self {
            tweet,
            parents,
            replies,
        }
    }
}

#[Object]
impl TweetThreadNode {
    async fn tweet(&self) -> &TweetNode {
        &self.tweet
    }

    async fn parents(&self) -> &Vec<TweetNode> {
        &self.parents
    }

    async fn replies(&self) -> &Vec<TweetNode> {
        &self.replies
    }
}

// ============================================================================
// Question Thread Node
// ============================================================================

pub struct AnswerWithCommentsNode {
    answer: TweetNode,
    comments: Vec<TweetNode>,
}

impl From<AnswerWithComments> for AnswerWithCommentsNode {
    fn from(item: AnswerWithComments) -> Self {
        let answer = TweetNode::from(item.answer);
        let comments = item.comments.into_iter().map(TweetNode::from).collect();
        Self { answer, comments }
    }
}

#[Object]
impl AnswerWithCommentsNode {
    async fn answer(&self) -> &TweetNode {
        &self.answer
    }

    async fn comments(&self) -> &Vec<TweetNode> {
        &self.comments
    }
}

pub struct QuestionThreadNode {
    question: TweetNode,
    question_comments: Vec<TweetNode>,
    answers: Vec<AnswerWithCommentsNode>,
}

impl From<QuestionThreadResponse> for QuestionThreadNode {
    fn from(response: QuestionThreadResponse) -> Self {
        let question = TweetNode::from(response.question);
        let question_comments = response
            .question_comments
            .into_iter()
            .map(TweetNode::from)
            .collect();
        let answers = response
            .answers
            .into_iter()
            .map(AnswerWithCommentsNode::from)
            .collect();
        Self {
            question,
            question_comments,
            answers,
        }
    }
}

#[Object]
impl QuestionThreadNode {
    async fn question(&self) -> &TweetNode {
        &self.question
    }

    async fn question_comments(&self) -> &Vec<TweetNode> {
        &self.question_comments
    }

    async fn answers(&self) -> &Vec<AnswerWithCommentsNode> {
        &self.answers
    }
}

// ============================================================================
// Claimable Reward Node
// ============================================================================

#[derive(SimpleObject, Clone)]
pub struct ClaimableRewardNode {
    pub tweet_id: ID,
    pub post_id_hash: String,
    pub token_mint: String,
    pub amount: String,      // Amount as string (in token units)
    pub reward_type: String, // "creator" or "voter"
}
