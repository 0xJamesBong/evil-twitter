pub async fn pump_price(user: User, tweet: Tweet) -> i64 {
    let pump_price = 1_i64;
    let bling_token = TokenType::Bling;
}

pub async fn smack_price(user: User, tweet: Tweet) -> i64 {
    let smack_price = 1_i64;
    let bling_token = TokenType::Bling;
}

pub async fn pump_tweet(db: &Database, user_id: ObjectId, tweet_id: ObjectId) -> Result<()> {
    let tweets = db.collection::<Tweet>("tweets");
    let pump_smack_states = db.collection::<PumpSmackState>("pump_smack_states");

    let tweet = tweets
        .find_one(doc! {"_id": tweet_id})
        .await?
        .ok_or_else(|| anyhow::anyhow!("Tweet not found"))?;
    let pump_smack_state = pump_smack_states
        .find_one(doc! {"user_id": user_id, "tweet_id": tweet_id})
        .await?
        .ok_or_else(|| anyhow::anyhow!("PumpSmackState not found"))?;

    // PUMP price = 1 * (current pump_count + 1)
    let cost = pump_smack_state.calc_pump_price();

    // 10% goes to the protocol immediately
    let burn = (cost as f64 * 0.1).ceil() as i64;
    let pot_amount = cost - burn;

    transfer(
        db,
        AccountOwner::User(user_id),
        AccountOwner::Tweet(tweet_id),
        TokenType::Bling,
        pot_amount,
        &format!("Pump tweet by {}", user.username),
    )
    .await?;

    // Burn to protocol
    transfer(
        db,
        AccountOwner::User(user_id),
        AccountOwner::User(ObjectId::from_bytes([0u8; 12])), // protocol account
        TokenType::Bling,
        burn,
        "BLING burn (10%)",
    )
    .await?;

    // Update pump_smack_state
    pump_smack_state.pump_count += 1;
    pump_smack_state.updated_at = DateTime::now();

    pump_smack_states
        .update_one(doc! { "_id": pump_smack_state.id }, doc! { "$set": { "pump_count": pump_smack_state.pump_count, "updated_at": DateTime::now() }})
        .await?;

    Ok(())
}

pub async fn smack_tweet(db: &Database, user_id: ObjectId, tweet_id: ObjectId) -> Result<()> {
    let tweets = db.collection::<Tweet>("tweets");
    let pump_smack_states = db.collection::<PumpSmackState>("pump_smack_states");

    // Load tweet
    let mut tweet = tweets
        .find_one(doc! { "_id": tweet_id })
        .await?
        .ok_or_else(|| anyhow::anyhow!("tweet not found"))?;

    let pump_smack_state = pump_smack_states
        .find_one(doc! {"user_id": user_id, "tweet_id": tweet_id})
        .await?
        .ok_or_else(|| anyhow::anyhow!("PumpSmackState not found"))?;

    // dynamic price
    let cost = pump_smack_state.calc_smack_price();

    // Burn 10%
    let burn = (cost as f64 * 0.10).ceil() as i64;
    let pot_amount = cost - burn;

    // Transfer
    transfer(
        db,
        AccountOwner::User(user_id),
        AccountOwner::Tweet(tweet_id),
        TokenType::Bling,
        pot_amount,
        &format!("SMACK {}", tweet_id),
    )
    .await?;

    transfer(
        db,
        AccountOwner::User(user_id),
        AccountOwner::User(ObjectId::from_bytes([0u8; 12])),
        TokenType::Bling,
        burn,
        "BLING burn (10%)",
    )
    .await?;

    // Update pump_smack_state
    pump_smack_state.smack_count += 1;
    pump_smack_state.updated_at = DateTime::now();

    pump_smack_states
        .update_one(doc! { "_id": pump_smack_state.id }, doc! { "$set": { "smack_count": pump_smack_state.smack_count, "updated_at": DateTime::now() }})
        .await?;

    Ok(())
}

pub async fn undo_pump(db: &Database, user_id: ObjectId, tweet_id: ObjectId) -> Result<(), Error> {
    todo!()
}

pub async fn undo_smack(db: &Database, user_id: ObjectId, tweet_id: ObjectId) -> Result<(), Error> {
    todo!()
}
