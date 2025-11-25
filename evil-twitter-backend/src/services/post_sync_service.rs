use crate::models::post_state::PostState;
use crate::services::SolanaService;
use crate::solana::errors::SolanaError;
use mongodb::{
    Collection, Database,
    bson::{DateTime, doc},
};
use std::sync::Arc;

pub struct PostSyncService {
    db: Database,
    solana_service: Arc<SolanaService>,
}

impl PostSyncService {
    pub fn new(db: Database, solana_service: Arc<SolanaService>) -> Self {
        Self { db, solana_service }
    }

    /// Sync a single post's state from chain to MongoDB
    pub fn sync_post_state(&self, post_id_hash: &str) -> Result<(), SolanaError> {
        // Parse post_id_hash from hex to [u8; 32]
        let post_id_hash_bytes = hex::decode(post_id_hash)
            .map_err(|e| SolanaError::InvalidAccountData(format!("Invalid post_id_hash: {}", e)))?;

        if post_id_hash_bytes.len() != 32 {
            return Err(SolanaError::InvalidAccountData(
                "post_id_hash must be 32 bytes".to_string(),
            ));
        }

        let mut post_id_hash_array = [0u8; 32];
        post_id_hash_array.copy_from_slice(&post_id_hash_bytes);

        // Fetch post account from chain
        let post_account = self.solana_service.get_post_account(post_id_hash_array)?;

        if post_account.is_none() {
            // Post doesn't exist on-chain yet, skip sync
            return Ok(());
        }

        // TODO: Properly deserialize PostAccount from chain
        // For now, this is a placeholder that needs proper implementation
        // The PostAccount struct in solana_service.rs needs to match the on-chain structure

        Ok(())
    }

    /// Sync all posts (for cron job)
    pub fn sync_all_posts(&self) -> Result<(), SolanaError> {
        // This would query MongoDB for all tweets with post_id_hash
        // and sync each one
        // For now, this is a placeholder
        Ok(())
    }
}
