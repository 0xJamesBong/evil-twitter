use crate::models::tokens::enums::AccountOwner;
use crate::models::tokens::{TokenBalance, TokenLedgerEntry, TokenType};
use mongodb::options::UpdateOptions;
use mongodb::{
    Collection, Database,
    bson::{DateTime, doc, oid::ObjectId},
};

pub async fn transfer(
    db: &Database,
    from: AccountOwner,
    to: AccountOwner,
    token: TokenType,
    amount: i64,
    reason: &str,
) -> anyhow::Result<()> {
    if amount <= 0 {
        return Err(anyhow::anyhow!("invalid transfer amount"));
    }

    let balances: Collection<TokenBalance> = db.collection("token_balances");
    let ledger: Collection<TokenLedgerEntry> = db.collection("token_ledger");

    // debit
    balances
        .update_one(
            doc! { "owner": bson::to_bson(&from)?, "token": token },
            doc! {
                "$inc": { "amount": -amount },
                "$set": { "updated_at": DateTime::now() },
                "$setOnInsert": { "created_at": DateTime::now() }
            },
            UpdateOptions::builder().upsert(true).build(),
        )
        .await?;

    // credit
    balances
        .update_one(
            doc! { "owner": bson::to_bson(&to)?, "token": token },
            doc! {
                "$inc": { "amount": amount },
                "$set": { "updated_at": DateTime::now() },
                "$setOnInsert": { "created_at": DateTime::now() }
            },
            UpdateOptions::builder().upsert(true).build(),
        )
        .await?;

    // ledger entries
    ledger
        .insert_one(TokenLedgerEntry::new(from, token, -amount, reason), None)
        .await?;
    ledger
        .insert_one(TokenLedgerEntry::new(to, token, amount, reason), None)
        .await?;

    Ok(())
}
