use mongodb::{
    bson::{doc, oid::ObjectId, DateTime, Bson},
    Collection, Database,
};
use futures::TryStreamExt;
use crate::models::bounty::{Bounty, BountyStatus};

#[derive(Clone)]
pub struct BountyService {
    collection: Collection<Bounty>,
}

impl BountyService {
    pub fn new(db: Database) -> Self {
        Self {
            collection: db.collection("bounties"),
        }
    }

    pub async fn create_bounty(&self, bounty: Bounty) -> Result<ObjectId, mongodb::error::Error> {
        let result = self.collection.insert_one(bounty).await?;
        Ok(result.inserted_id.as_object_id().unwrap())
    }

    pub async fn get_bounty_by_id(&self, id: &ObjectId) -> Result<Option<Bounty>, mongodb::error::Error> {
        let filter = doc! { "_id": id };
        self.collection.find_one(filter).await
    }

    pub async fn get_bounty_by_onchain_pubkey(
        &self,
        pubkey: &str,
    ) -> Result<Option<Bounty>, mongodb::error::Error> {
        let filter = doc! { "onchain_bounty_pubkey": pubkey };
        self.collection.find_one(filter).await
    }

    pub async fn get_bounties_for_question(
        &self,
        question_tweet_id: &ObjectId,
    ) -> Result<Vec<Bounty>, mongodb::error::Error> {
        let filter = doc! { "question_tweet_id": question_tweet_id };
        let mut cursor = self.collection.find(filter).await?;
        let mut bounties = Vec::new();
        while let Some(bounty) = cursor.try_next().await? {
            bounties.push(bounty);
        }
        Ok(bounties)
    }

    pub async fn update_bounty_status(
        &self,
        id: &ObjectId,
        status: BountyStatus,
        answer_tweet_id: Option<ObjectId>,
    ) -> Result<(), mongodb::error::Error> {
        let mut update_doc = doc! {
            "$set": {
                "status": Bson::from(&status),
            }
        };

        if let Some(answer_id) = answer_tweet_id {
            update_doc.get_document_mut("$set").unwrap().insert("answer_tweet_id", answer_id);
            update_doc.get_document_mut("$set").unwrap().insert("awarded_at", DateTime::now());
        }

        let filter = doc! { "_id": id };
        self.collection.update_one(filter, update_doc).await?;
        Ok(())
    }

    pub async fn mark_bounty_claimed(
        &self,
        id: &ObjectId,
    ) -> Result<(), mongodb::error::Error> {
        let filter = doc! { "_id": id };
        let update = doc! {
            "$set": {
                "claimed": true,
                "claimed_at": DateTime::now(),
            }
        };
        self.collection.update_one(filter, update).await?;
        Ok(())
    }

    pub async fn mark_bounty_reclaimed(
        &self,
        id: &ObjectId,
    ) -> Result<(), mongodb::error::Error> {
        let filter = doc! { "_id": id };
        let update = doc! {
            "$set": {
                "claimed": true,
                "reclaimed_at": DateTime::now(),
            }
        };
        self.collection.update_one(filter, update).await?;
        Ok(())
    }

    pub async fn increase_bounty_amount(
        &self,
        id: &ObjectId,
        additional_amount: u64,
    ) -> Result<(), mongodb::error::Error> {
        let filter = doc! { "_id": id };
        let update = doc! {
            "$inc": {
                "amount": additional_amount as i64,
            }
        };
        self.collection.update_one(filter, update).await?;
        Ok(())
    }
}

