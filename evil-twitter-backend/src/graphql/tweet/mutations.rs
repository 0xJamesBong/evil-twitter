use async_graphql::{Context, ID, InputObject, Object, Result, SimpleObject};
use axum::http::HeaderMap;
use mongodb::{
    Collection,
    bson::{doc, oid::ObjectId},
};

use crate::{
    actions::engine::{ActionEngine, ActionType},
    graphql::GraphQLState,
    graphql::tweet::types::TweetNode,
    models::{
        like::Like,
        tokens::{enums::TokenType, token_balance::TokenBalance},
        tool::Tool,
        tweet::{
            Tweet, TweetAttackAction, TweetAuthorSnapshot, TweetEnergyState, TweetMetrics,
            TweetSupportAction, TweetType, TweetView, TweetViewerContext,
        },
        user::User,
    },
    routes::tweet::enrich_tweets_with_references,
    utils::auth::get_authenticated_user,
};

// ============================================================================
// Input Types
// ============================================================================

#[derive(InputObject)]
pub struct TweetCreateInput {
    pub content: String,
}

#[derive(InputObject)]
pub struct TweetReplyInput {
    pub content: String,
    pub replied_to_id: ID,
}

#[derive(InputObject)]
pub struct TweetQuoteInput {
    pub content: String,
    pub quoted_tweet_id: ID,
}

#[derive(InputObject)]
pub struct TweetSupportInput {
    pub tool_id: Option<ID>,
}

#[derive(InputObject)]
pub struct TweetAttackInput {
    pub tool_id: ID,
}

// ============================================================================
// Payload Types
// ============================================================================

#[derive(SimpleObject)]
pub struct TweetPayload {
    pub tweet: TweetNode,
}

#[derive(SimpleObject)]
pub struct TweetMetricsPayload {
    pub id: ID,
    pub like_count: i64,
    pub smack_count: i64,
    pub liked_by_viewer: bool,
    pub energy: f64,
}

#[derive(SimpleObject)]
pub struct TweetEnergyPayload {
    pub id: ID,
    pub energy: f64,
    pub energy_before: f64,
    pub energy_after: f64,
    pub delta: f64,
}

#[derive(SimpleObject)]
pub struct TweetSmackPayload {
    pub id: ID,
    pub energy: f64,
    pub tokens_charged: i64,
    pub tokens_paid_to_author: i64,
}

// ============================================================================
// Helper Functions
// ============================================================================

const LIKE_IMPACT: f64 = 10.0;

async fn get_authenticated_user_from_ctx(ctx: &Context<'_>) -> Result<User> {
    let headers = ctx
        .data::<HeaderMap>()
        .map_err(|_| async_graphql::Error::new("Failed to get headers from context"))?;

    let state = ctx.data::<GraphQLState>()?;
    get_authenticated_user(&state.db, headers)
        .await
        .map_err(|(status, json)| {
            let error_msg = json
                .get("error")
                .and_then(|v| v.as_str())
                .unwrap_or("Authentication failed");
            async_graphql::Error::new(format!("{} (status {})", error_msg, status))
        })
}

fn parse_object_id(id: &ID) -> Result<ObjectId> {
    ObjectId::parse_str(id.as_str())
        .map_err(|_| async_graphql::Error::new("Invalid ObjectId format"))
}

// ============================================================================
// TweetMutation Object
// ============================================================================

#[derive(Default)]
pub struct TweetMutation;

#[Object]
impl TweetMutation {
    /// Create a new tweet
    async fn tweet_create(
        &self,
        ctx: &Context<'_>,
        input: TweetCreateInput,
    ) -> Result<TweetPayload> {
        tweet_create_resolver(ctx, input).await
    }

    /// Like or unlike a tweet (toggle)
    async fn tweet_like(
        &self,
        ctx: &Context<'_>,
        id: ID,
        idempotency_key: Option<String>,
    ) -> Result<TweetMetricsPayload> {
        tweet_like_resolver(ctx, id, idempotency_key).await
    }

    /// Smack a tweet (costs 1 BLING, decreases energy by 1)
    async fn tweet_smack(
        &self,
        ctx: &Context<'_>,
        id: ID,
        idempotency_key: Option<String>,
    ) -> Result<TweetSmackPayload> {
        tweet_smack_resolver(ctx, id, idempotency_key).await
    }

    /// Reply to a tweet
    async fn tweet_reply(&self, ctx: &Context<'_>, input: TweetReplyInput) -> Result<TweetPayload> {
        tweet_reply_resolver(ctx, input).await
    }

    /// Quote a tweet
    async fn tweet_quote(&self, ctx: &Context<'_>, input: TweetQuoteInput) -> Result<TweetPayload> {
        tweet_quote_resolver(ctx, input).await
    }

    /// Retweet a tweet
    async fn tweet_retweet(&self, ctx: &Context<'_>, id: ID) -> Result<TweetPayload> {
        tweet_retweet_resolver(ctx, id).await
    }

    /// Support a tweet with a tool
    async fn tweet_support(
        &self,
        ctx: &Context<'_>,
        id: ID,
        input: TweetSupportInput,
    ) -> Result<TweetEnergyPayload> {
        tweet_support_resolver(ctx, id, input).await
    }

    /// Attack a tweet with a weapon
    async fn tweet_attack(
        &self,
        ctx: &Context<'_>,
        id: ID,
        input: TweetAttackInput,
    ) -> Result<TweetEnergyPayload> {
        tweet_attack_resolver(ctx, id, input).await
    }
}

// ============================================================================
// Mutation Resolvers (internal functions)
// ============================================================================

/// Create a new tweet
pub async fn tweet_create_resolver(
    ctx: &Context<'_>,
    input: TweetCreateInput,
) -> Result<TweetPayload> {
    let state = ctx.data::<GraphQLState>()?;
    let tweet_collection: Collection<Tweet> = state.db.collection("tweets");
    let user_collection: Collection<User> = state.db.collection("users");

    let user = get_authenticated_user_from_ctx(ctx).await?;
    let owner_id = user
        .id
        .ok_or_else(|| async_graphql::Error::new("User record missing identifier"))?;
    let username = user.username;
    let display_name = user.display_name;
    let avatar_url = user.avatar_url;

    let now = mongodb::bson::DateTime::now();
    let tweet_id = ObjectId::new();

    let tweet = Tweet {
        id: Some(tweet_id),
        owner_id,
        content: input.content,
        tweet_type: TweetType::Original,
        quoted_tweet_id: None,
        replied_to_tweet_id: None,
        root_tweet_id: Some(tweet_id),
        reply_depth: 0,
        created_at: now,
        updated_at: Some(now),
        metrics: TweetMetrics::default(),
        author_snapshot: TweetAuthorSnapshot {
            username: Some(username),
            display_name: Some(display_name),
            avatar_url,
        },
        viewer_context: TweetViewerContext::default(),
        energy_state: TweetEnergyState::default(),
    };

    tweet_collection
        .insert_one(&tweet)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create tweet: {}", e)))?;

    let views = enrich_tweets_with_references(vec![tweet], &tweet_collection, &user_collection)
        .await
        .map_err(|(status, _)| {
            async_graphql::Error::new(format!("Failed to hydrate tweet (status {})", status))
        })?;

    let view = views
        .into_iter()
        .next()
        .ok_or_else(|| async_graphql::Error::new("Failed to hydrate tweet"))?;

    Ok(TweetPayload {
        tweet: TweetNode::from(view),
    })
}

/// Like or unlike a tweet (toggle)
pub async fn tweet_like_resolver(
    ctx: &Context<'_>,
    id: ID,
    _idempotency_key: Option<String>,
) -> Result<TweetMetricsPayload> {
    let state = ctx.data::<GraphQLState>()?;
    let collection: Collection<Tweet> = state.db.collection("tweets");
    let like_collection: Collection<Like> = state.db.collection("likes");
    let object_id = parse_object_id(&id)?;

    let user = get_authenticated_user_from_ctx(ctx).await?;
    let user_id = user
        .id
        .ok_or_else(|| async_graphql::Error::new("User record missing identifier"))?;

    let mut tweet = collection
        .find_one(doc! {"_id": object_id})
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?
        .ok_or_else(|| async_graphql::Error::new("Tweet not found"))?;

    let like_filter = doc! {"user_id": user_id, "tweet_id": object_id};
    let existing_like = like_collection
        .find_one(like_filter.clone())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

    let is_liking = existing_like.is_none();

    if is_liking {
        // Like the tweet
        let support_action = TweetSupportAction {
            timestamp: mongodb::bson::DateTime::now(),
            impact: LIKE_IMPACT,
            user_id,
            tool: None,
        };
        tweet.energy_state.record_support(support_action);
        tweet.metrics.inc_like();

        let like = Like {
            id: None,
            user_id,
            tweet_id: object_id,
            created_at: mongodb::bson::DateTime::now(),
        };

        like_collection
            .insert_one(&like)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

        collection
            .update_one(
                doc! {"_id": object_id},
                doc! {
                    "$inc": {"metrics.likes": 1},
                    "$set": {
                        "energy_state": mongodb::bson::to_bson(&tweet.energy_state)
                            .map_err(|e| async_graphql::Error::new(format!("Serialization error: {}", e)))?,
                        "metrics.smacks": tweet.metrics.smacks
                    }
                },
            )
            .await
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;
    } else {
        // Unlike the tweet
        like_collection
            .delete_one(like_filter)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

        tweet.energy_state.revert_support(LIKE_IMPACT);

        collection
            .update_one(
                doc! {"_id": object_id},
                doc! {
                    "$inc": {"metrics.likes": -1},
                    "$set": {
                        "energy_state": mongodb::bson::to_bson(&tweet.energy_state)
                            .map_err(|e| async_graphql::Error::new(format!("Serialization error: {}", e)))?,
                        "metrics.smacks": tweet.metrics.smacks
                    }
                },
            )
            .await
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;
    }

    // Fetch updated tweet to get accurate counts
    let updated_tweet = collection
        .find_one(doc! {"_id": object_id})
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?
        .ok_or_else(|| async_graphql::Error::new("Tweet not found after update"))?;

    Ok(TweetMetricsPayload {
        id,
        like_count: updated_tweet.metrics.likes,
        smack_count: updated_tweet.metrics.smacks,
        liked_by_viewer: is_liking,
        energy: updated_tweet.energy_state.energy,
    })
}

/// Smack a tweet (costs 1 BLING, decreases energy by 1)
pub async fn tweet_smack_resolver(
    ctx: &Context<'_>,
    id: ID,
    _idempotency_key: Option<String>,
) -> Result<TweetSmackPayload> {
    let state = ctx.data::<GraphQLState>()?;
    let collection: Collection<Tweet> = state.db.collection("tweets");
    let token_balance_collection: Collection<TokenBalance> = state.db.collection("token_balances");
    let object_id = parse_object_id(&id)?;

    let user = get_authenticated_user_from_ctx(ctx).await?;
    let user_id = user
        .id
        .ok_or_else(|| async_graphql::Error::new("User record missing identifier"))?;

    // Check BLING balance
    let smack_cost = 1_i64;
    let bling_token = mongodb::bson::to_bson(&TokenType::Bling)
        .map_err(|e| async_graphql::Error::new(format!("Serialization error: {}", e)))?;
    let balance_filter = doc! {
        "user_id": user_id,
        "token": bling_token.clone(),
    };

    let balance = token_balance_collection
        .find_one(balance_filter.clone())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

    let current_balance = balance.as_ref().map(|b| b.amount).unwrap_or(0_i64);

    if current_balance < smack_cost {
        return Err(async_graphql::Error::new(format!(
            "Insufficient BLING tokens. Required: {}, Available: {}",
            smack_cost, current_balance
        )));
    }

    // Fetch and update tweet
    let mut tweet = collection
        .find_one(doc! {"_id": object_id})
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?
        .ok_or_else(|| async_graphql::Error::new("Tweet not found"))?;
    let tweet_owner_id = tweet.owner_id;

    // Record attack
    let attack_action = TweetAttackAction {
        timestamp: mongodb::bson::DateTime::now(),
        impact: 1.0,
        user_id,
        tool: None,
    };
    tweet.energy_state.record_attack(attack_action);
    tweet.metrics.inc_smack();

    // Deduct tokens from smacker
    token_balance_collection
        .update_one(balance_filter, doc! {"$inc": {"amount": -smack_cost}})
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

    // Credit tokens to author
    let author_filter = doc! {
        "user_id": tweet_owner_id,
        "token": bling_token.clone(),
    };
    token_balance_collection
        .update_one(author_filter, doc! {"$inc": {"amount": smack_cost}})
        .upsert(true)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

    // Update tweet
    collection
        .update_one(
            doc! {"_id": object_id},
            doc! {
                "$inc": {"metrics.smacks": 1},
                "$set": {
                    "energy_state": mongodb::bson::to_bson(&tweet.energy_state)
                        .map_err(|e| async_graphql::Error::new(format!("Serialization error: {}", e)))?,
                    "metrics.smacks": tweet.metrics.smacks
                }
            },
        )
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

    Ok(TweetSmackPayload {
        id,
        energy: tweet.energy_state.energy,
        tokens_charged: smack_cost,
        tokens_paid_to_author: smack_cost,
    })
}

/// Reply to a tweet
pub async fn tweet_reply_resolver(
    ctx: &Context<'_>,
    input: TweetReplyInput,
) -> Result<TweetPayload> {
    let state = ctx.data::<GraphQLState>()?;
    let collection: Collection<Tweet> = state.db.collection("tweets");
    let user_collection: Collection<User> = state.db.collection("users");

    let user = get_authenticated_user_from_ctx(ctx).await?;
    let owner_id = user
        .id
        .ok_or_else(|| async_graphql::Error::new("User record missing identifier"))?;

    let replied_id = parse_object_id(&input.replied_to_id)?;
    let replied_tweet = collection
        .find_one(doc! {"_id": replied_id})
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?
        .ok_or_else(|| async_graphql::Error::new("Tweet not found"))?;

    let now = mongodb::bson::DateTime::now();
    let username = user.username;
    let display_name = user.display_name;
    let avatar_url = user.avatar_url;

    let reply_id = ObjectId::new();
    let root_id = replied_tweet
        .root_tweet_id
        .or(replied_tweet.id)
        .unwrap_or(replied_id);

    let reply = Tweet {
        id: Some(reply_id),
        owner_id,
        content: input.content,
        tweet_type: TweetType::Reply,
        quoted_tweet_id: None,
        replied_to_tweet_id: Some(replied_id),
        root_tweet_id: Some(root_id),
        reply_depth: replied_tweet.reply_depth + 1,
        created_at: now,
        updated_at: Some(now),
        metrics: TweetMetrics::default(),
        author_snapshot: TweetAuthorSnapshot {
            username: Some(username),
            display_name: Some(display_name),
            avatar_url,
        },
        viewer_context: TweetViewerContext::default(),
        energy_state: TweetEnergyState::default(),
    };

    collection
        .insert_one(&reply)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create reply: {}", e)))?;

    collection
        .update_one(
            doc! {"_id": replied_id},
            doc! {"$inc": {"metrics.replies": 1}},
        )
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

    let hydrated = enrich_tweets_with_references(vec![reply], &collection, &user_collection)
        .await
        .map_err(|(status, _)| {
            async_graphql::Error::new(format!("Failed to hydrate reply (status {})", status))
        })?;

    let view = hydrated
        .into_iter()
        .next()
        .ok_or_else(|| async_graphql::Error::new("Failed to hydrate reply"))?;

    Ok(TweetPayload {
        tweet: TweetNode::from(view),
    })
}

/// Quote a tweet
pub async fn tweet_quote_resolver(
    ctx: &Context<'_>,
    input: TweetQuoteInput,
) -> Result<TweetPayload> {
    let state = ctx.data::<GraphQLState>()?;
    let collection: Collection<Tweet> = state.db.collection("tweets");
    let user_collection: Collection<User> = state.db.collection("users");

    let user = get_authenticated_user_from_ctx(ctx).await?;
    let quoted_id = parse_object_id(&input.quoted_tweet_id)?;

    let _quoted_tweet = collection
        .find_one(doc! {"_id": quoted_id})
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?
        .ok_or_else(|| async_graphql::Error::new("Original tweet not found"))?;

    let now = mongodb::bson::DateTime::now();
    let owner_id = user
        .id
        .ok_or_else(|| async_graphql::Error::new("User record missing identifier"))?;
    let username = user.username;
    let display_name = user.display_name;
    let avatar_url = user.avatar_url;

    let quote_id = ObjectId::new();

    let quote = Tweet {
        id: Some(quote_id),
        owner_id,
        content: input.content,
        tweet_type: TweetType::Quote,
        quoted_tweet_id: Some(quoted_id),
        replied_to_tweet_id: None,
        root_tweet_id: Some(quote_id),
        reply_depth: 0,
        created_at: now,
        updated_at: Some(now),
        metrics: TweetMetrics::default(),
        author_snapshot: TweetAuthorSnapshot {
            username: Some(username),
            display_name: Some(display_name),
            avatar_url,
        },
        viewer_context: TweetViewerContext::default(),
        energy_state: TweetEnergyState::default(),
    };

    collection
        .insert_one(&quote)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create quote: {}", e)))?;

    collection
        .update_one(
            doc! {"_id": quoted_id},
            doc! {"$inc": {"metrics.quotes": 1}},
        )
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

    let hydrated = enrich_tweets_with_references(vec![quote], &collection, &user_collection)
        .await
        .map_err(|(status, _)| {
            async_graphql::Error::new(format!("Failed to hydrate quote (status {})", status))
        })?;

    let view = hydrated
        .into_iter()
        .next()
        .ok_or_else(|| async_graphql::Error::new("Failed to hydrate quote"))?;

    Ok(TweetPayload {
        tweet: TweetNode::from(view),
    })
}

/// Retweet a tweet
pub async fn tweet_retweet_resolver(ctx: &Context<'_>, id: ID) -> Result<TweetPayload> {
    let state = ctx.data::<GraphQLState>()?;
    let collection: Collection<Tweet> = state.db.collection("tweets");
    let user_collection: Collection<User> = state.db.collection("users");

    let user = get_authenticated_user_from_ctx(ctx).await?;
    let owner_id = user
        .id
        .ok_or_else(|| async_graphql::Error::new("User record missing identifier"))?;

    let original_id = parse_object_id(&id)?;
    let original_tweet = collection
        .find_one(doc! {"_id": original_id})
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?
        .ok_or_else(|| async_graphql::Error::new("Original tweet not found"))?;

    let now = mongodb::bson::DateTime::now();
    let username = user.username;
    let display_name = user.display_name;
    let avatar_url = user.avatar_url;

    let retweet_id = ObjectId::new();

    let retweet = Tweet {
        id: Some(retweet_id),
        owner_id,
        content: original_tweet.content.clone(),
        tweet_type: TweetType::Retweet,
        quoted_tweet_id: Some(original_id),
        replied_to_tweet_id: None,
        root_tweet_id: Some(retweet_id),
        reply_depth: 0,
        created_at: now,
        updated_at: Some(now),
        metrics: TweetMetrics::default(),
        author_snapshot: TweetAuthorSnapshot {
            username: Some(username),
            display_name: Some(display_name),
            avatar_url,
        },
        viewer_context: TweetViewerContext::default(),
        energy_state: TweetEnergyState::default(),
    };

    collection
        .insert_one(&retweet)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create retweet: {}", e)))?;

    collection
        .update_one(
            doc! {"_id": original_id},
            doc! {"$inc": {"metrics.retweets": 1}},
        )
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

    let hydrated = enrich_tweets_with_references(vec![retweet], &collection, &user_collection)
        .await
        .map_err(|(status, _)| {
            async_graphql::Error::new(format!("Failed to hydrate retweet (status {})", status))
        })?;

    let view = hydrated
        .into_iter()
        .next()
        .ok_or_else(|| async_graphql::Error::new("Failed to hydrate retweet"))?;

    Ok(TweetPayload {
        tweet: TweetNode::from(view),
    })
}

/// Support a tweet with a tool
pub async fn tweet_support_resolver(
    ctx: &Context<'_>,
    id: ID,
    input: TweetSupportInput,
) -> Result<TweetEnergyPayload> {
    let state = ctx.data::<GraphQLState>()?;
    let tweet_collection: Collection<Tweet> = state.db.collection("tweets");
    let tool_collection: Collection<Tool> = state.db.collection("tools");

    let user = get_authenticated_user_from_ctx(ctx).await?;
    let tweet_id = parse_object_id(&id)?;

    let tool_id = input
        .tool_id
        .map(|id| parse_object_id(&id))
        .transpose()?
        .ok_or_else(|| async_graphql::Error::new("Tool ID is required"))?;

    let support_tool = tool_collection
        .find_one(doc! {"_id": tool_id})
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?
        .ok_or_else(|| async_graphql::Error::new("Support tool not found"))?;

    let mut tweet = tweet_collection
        .find_one(doc! {"_id": tweet_id})
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?
        .ok_or_else(|| async_graphql::Error::new("Tweet not found"))?;

    let energy_before = tweet.energy_state.energy;
    let mut tool_clone = support_tool.clone();
    ActionEngine::act_on_tweet(
        &user,
        &mut tweet,
        Some(&mut tool_clone),
        ActionType::Support,
    );
    let energy_after = tweet.energy_state.energy;
    let support = energy_after - energy_before;

    tweet_collection
        .update_one(
            doc! {"_id": tweet_id},
            doc! {
                "$set": {
                    "energy_state": mongodb::bson::to_bson(&tweet.energy_state)
                        .map_err(|e| async_graphql::Error::new(format!("Serialization error: {}", e)))?
                }
            },
        )
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

    Ok(TweetEnergyPayload {
        id,
        energy: tweet.energy_state.energy,
        energy_before,
        energy_after,
        delta: support,
    })
}

/// Attack a tweet with a weapon
pub async fn tweet_attack_resolver(
    ctx: &Context<'_>,
    id: ID,
    input: TweetAttackInput,
) -> Result<TweetEnergyPayload> {
    let state = ctx.data::<GraphQLState>()?;
    let tweet_collection: Collection<Tweet> = state.db.collection("tweets");
    let tool_collection: Collection<Tool> = state.db.collection("tools");

    let user = get_authenticated_user_from_ctx(ctx).await?;
    let weapon_id = parse_object_id(&input.tool_id)?;

    let weapon = tool_collection
        .find_one(doc! {"_id": weapon_id})
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?
        .ok_or_else(|| async_graphql::Error::new("Weapon not found"))?;

    let tweet_id = parse_object_id(&id)?;
    let mut tweet = tweet_collection
        .find_one(doc! {"_id": tweet_id})
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?
        .ok_or_else(|| async_graphql::Error::new("Tweet not found"))?;

    let energy_before = tweet.energy_state.energy;
    let mut weapon_clone = weapon.clone();
    ActionEngine::act_on_tweet(
        &user,
        &mut tweet,
        Some(&mut weapon_clone),
        ActionType::Attack,
    );
    let energy_after = tweet.energy_state.energy;
    let damage = energy_before - energy_after;

    tweet_collection
        .update_one(
            doc! {"_id": tweet_id},
            doc! {
                "$set": {
                    "energy_state": mongodb::bson::to_bson(&tweet.energy_state)
                        .map_err(|e| async_graphql::Error::new(format!("Serialization error: {}", e)))?
                }
            },
        )
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

    Ok(TweetEnergyPayload {
        id,
        energy: tweet.energy_state.energy,
        energy_before,
        energy_after,
        delta: damage,
    })
}
