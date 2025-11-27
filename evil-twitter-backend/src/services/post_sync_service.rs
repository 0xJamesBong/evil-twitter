// use crate::models::post_state::PostState;
// use crate::services::SolanaService;
// use crate::solana::errors::SolanaError;
// use mongodb::{
//     Collection, Database,
//     bson::{DateTime, doc},
// };
// use std::sync::Arc;

// pub struct PostSyncService {
//     db: Database,
//     solana_service: Arc<SolanaService>,
// }

// impl PostSyncService {
//     pub fn new(db: Database, solana_service: Arc<SolanaService>) -> Self {
//         Self { db, solana_service }
//     }

//     /// Sync a single post's state from chain to MongoDB
//     pub async fn sync_post_state(&self, post_id_hash: &str) -> Result<(), SolanaError> {
//         // Parse post_id_hash from hex to [u8; 32]
//         let post_id_hash_bytes = hex::decode(post_id_hash)
//             .map_err(|e| SolanaError::InvalidAccountData(format!("Invalid post_id_hash: {}", e)))?;

//         if post_id_hash_bytes.len() != 32 {
//             return Err(SolanaError::InvalidAccountData(
//                 "post_id_hash must be 32 bytes".to_string(),
//             ));
//         }

//         let mut post_id_hash_array = [0u8; 32];
//         post_id_hash_array.copy_from_slice(&post_id_hash_bytes);

//         // Fetch post account from chain
//         let post_account = self.solana_service.get_post_account(post_id_hash_array)?;

//         if post_account.is_none() {
//             // Post doesn't exist on-chain yet, skip sync
//             return Ok(());
//         }

//         let post_account = post_account.unwrap();

//         // Derive post PDA
//         let (post_pda, _) = crate::solana::pda::get_post_pda(
//             self.solana_service.get_program_id(),
//             &post_id_hash_array,
//         );

//         // Convert state enum to string
//         let state = match post_account.state {
//             0 => "Open".to_string(),
//             1 => "Settled".to_string(),
//             _ => "Unknown".to_string(),
//         };

//         // Convert winning_side to string
//         let winning_side = post_account.winning_side.map(|side| match side {
//             0 => "Pump".to_string(),
//             1 => "Smack".to_string(),
//             _ => "Unknown".to_string(),
//         });

//         // Create PostState document
//         let post_state = PostState {
//             id: None, // Will be set by MongoDB on insert
//             post_id_hash: post_id_hash.to_string(),
//             post_pda: post_pda.to_string(),
//             state,
//             upvotes: post_account.upvotes,
//             downvotes: post_account.downvotes,
//             winning_side,
//             start_time: post_account.start_time,
//             end_time: post_account.end_time,
//             last_synced_at: DateTime::now(),
//         };

//         // Upsert into MongoDB - first try to find existing, then insert or replace
//         let collection: Collection<PostState> = self.db.collection(PostState::COLLECTION_NAME);
//         let filter = doc! { "post_id_hash": post_id_hash };

//         // Check if document exists
//         let existing = collection.find_one(filter.clone()).await.map_err(|e| {
//             SolanaError::RpcError(format!("Failed to check existing post state: {}", e))
//         })?;

//         if existing.is_some() {
//             // Update existing document
//             let update = doc! {
//                 "$set": {
//                     "post_pda": &post_state.post_pda,
//                     "state": &post_state.state,
//                     "upvotes": post_state.upvotes as i64,
//                     "downvotes": post_state.downvotes as i64,
//                     "winning_side": &post_state.winning_side,
//                     "start_time": post_state.start_time,
//                     "end_time": post_state.end_time,
//                     "last_synced_at": post_state.last_synced_at,
//                 }
//             };
//             collection.update_one(filter, update).await.map_err(|e| {
//                 SolanaError::RpcError(format!("Failed to update post state: {}", e))
//             })?;
//         } else {
//             // Insert new document
//             collection.insert_one(&post_state).await.map_err(|e| {
//                 SolanaError::RpcError(format!("Failed to insert post state: {}", e))
//             })?;
//         }

//         Ok(())
//     }

//     /// Sync all posts (for cron job)
//     pub fn sync_all_posts(&self) -> Result<(), SolanaError> {
//         // This would query MongoDB for all tweets with post_id_hash
//         // and sync each one
//         // For now, this is a placeholder
//         Ok(())
//     }
// }
