use crate::solana::{errors::SolanaError, pda::*, program::SolanaProgram};
use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Signature, Signer},
    system_program,
    transaction::Transaction,
};
use std::sync::Arc;

// Re-export state types for use in service
// These will be deserialized from on-chain accounts
#[derive(Debug, Clone)]
pub struct PostAccount {
    pub creator_user: Pubkey,
    pub post_id_hash: [u8; 32],
    pub start_time: i64,
    pub end_time: i64,
    pub state: u8, // 0 = Open, 1 = Settled
    pub upvotes: u64,
    pub downvotes: u64,
    pub winning_side: Option<u8>, // 0 = Pump, 1 = Smack
}

#[derive(Debug, Clone)]
pub struct UserAccount {
    pub user: Pubkey,
    pub social_score: i64,
    pub bump: u8,
}

#[derive(Debug, Clone)]
pub struct UserPostPosition {
    pub user: Pubkey,
    pub post: Pubkey,
    pub upvotes: u64,
    pub downvotes: u64,
}

pub struct SolanaService {
    program: Arc<SolanaProgram>,
    program_id: Pubkey,
    bling_mint: Pubkey,
}

impl SolanaService {
    pub fn new(program: Arc<SolanaProgram>, program_id: Pubkey, bling_mint: Pubkey) -> Self {
        Self {
            program,
            program_id,
            bling_mint,
        }
    }

    pub fn get_program_id(&self) -> &Pubkey {
        &self.program_id
    }

    pub fn get_bling_mint(&self) -> &Pubkey {
        &self.bling_mint
    }

    /// Create a user account on-chain
    pub fn create_user(&self, _user_wallet: &Pubkey) -> Result<Signature, SolanaError> {
        // This will be implemented using anchor-client or manual transaction building
        // For now, return an error indicating it needs implementation
        Err(SolanaError::RpcError(
            "create_user not yet implemented".to_string(),
        ))
    }

    /// Create a post on-chain
    pub fn create_post(
        &self,
        user_wallet: &Pubkey,
        post_id_hash: [u8; 32],
        parent_post_pda: Option<Pubkey>,
    ) -> Result<Signature, SolanaError> {
        let connection = self.program.get_connection();
        let payer = self.program.get_payer();

        // Derive PDAs
        let (config_pda, _) = get_config_pda(&self.program_id);
        let (user_account_pda, _) = get_user_account_pda(&self.program_id, user_wallet);
        let (post_pda, _) = get_post_pda(&self.program_id, &post_id_hash);

        // Build instruction accounts
        let accounts = vec![
            AccountMeta::new_readonly(config_pda, false),
            AccountMeta::new(*user_wallet, true), // user signer
            AccountMeta::new(payer.pubkey(), true), // payer signer
            AccountMeta::new_readonly(user_account_pda, false),
            AccountMeta::new(post_pda, false),
            AccountMeta::new_readonly(system_program::id(), false),
        ];

        // Build instruction data
        // Discriminator for create_post: [123, 92, 184, 29, 231, 24, 15, 202]
        let mut instruction_data = vec![123u8, 92, 184, 29, 231, 24, 15, 202];
        instruction_data.extend_from_slice(&post_id_hash);
        if let Some(parent) = parent_post_pda {
            instruction_data.push(1); // Some variant
            instruction_data.extend_from_slice(&parent.to_bytes());
        } else {
            instruction_data.push(0); // None variant
        }

        let instruction = Instruction {
            program_id: self.program_id,
            accounts,
            data: instruction_data,
        };

        let mut transaction = Transaction::new_with_payer(&[instruction], Some(&payer.pubkey()));

        let connection_service = self.program.get_connection_service();
        let recent_blockhash = connection_service.get_latest_blockhash()?;

        transaction.sign(&[payer], recent_blockhash);

        let signature = connection
            .send_and_confirm_transaction(&transaction)
            .map_err(|e| {
                SolanaError::TransactionError(format!("Failed to send transaction: {}", e))
            })?;

        Ok(signature)
    }

    /// Vote on a post
    pub fn vote_on_post(
        &self,
        _voter_wallet: &Pubkey,
        _post_id_hash: [u8; 32],
        _side: u8, // 0 = Pump, 1 = Smack
        _votes: u64,
        _token_mint: &Pubkey,
    ) -> Result<Signature, SolanaError> {
        // This is a complex instruction with many accounts
        // Will need to derive all PDAs and build the instruction
        Err(SolanaError::RpcError(
            "vote_on_post not yet implemented".to_string(),
        ))
    }

    /// Settle a post
    pub fn settle_post(
        &self,
        _post_id_hash: [u8; 32],
        _token_mint: &Pubkey,
    ) -> Result<Signature, SolanaError> {
        Err(SolanaError::RpcError(
            "settle_post not yet implemented".to_string(),
        ))
    }

    /// Claim post reward
    pub fn claim_post_reward(
        &self,
        _user_wallet: &Pubkey,
        _post_id_hash: [u8; 32],
        _token_mint: &Pubkey,
    ) -> Result<Signature, SolanaError> {
        Err(SolanaError::RpcError(
            "claim_post_reward not yet implemented".to_string(),
        ))
    }

    /// Get post account from chain
    pub fn get_post_account(
        &self,
        post_id_hash: [u8; 32],
    ) -> Result<Option<PostAccount>, SolanaError> {
        let connection = self.program.get_connection();
        let (post_pda, _) = get_post_pda(&self.program_id, &post_id_hash);

        let account = connection.get_account(&post_pda).map_err(|e| {
            SolanaError::AccountNotFound(format!("Failed to fetch post account: {}", e))
        })?;

        let account_data = account.data;

        // Deserialize PostAccount from account data
        // Skip the 8-byte discriminator
        if account_data.len() < 8 {
            return Ok(None);
        }

        // This is a simplified deserialization - in production, use proper Anchor deserialization
        // For now, return None to indicate it needs proper implementation
        Ok(None)
    }

    /// Get user account from chain
    pub fn get_user_account(
        &self,
        user_wallet: &Pubkey,
    ) -> Result<Option<UserAccount>, SolanaError> {
        let connection = self.program.get_connection();
        let (user_account_pda, _) = get_user_account_pda(&self.program_id, user_wallet);

        let account = connection.get_account(&user_account_pda).map_err(|e| {
            SolanaError::AccountNotFound(format!("Failed to fetch user account: {}", e))
        })?;

        let account_data = account.data;

        if account_data.len() < 8 {
            return Ok(None);
        }

        Ok(None) // Needs proper deserialization
    }

    /// Get user position for a post
    pub fn get_user_position(
        &self,
        post_id_hash: [u8; 32],
        user_wallet: &Pubkey,
    ) -> Result<Option<UserPostPosition>, SolanaError> {
        let connection = self.program.get_connection();
        let (post_pda, _) = get_post_pda(&self.program_id, &post_id_hash);
        let (position_pda, _) = get_position_pda(&self.program_id, &post_pda, user_wallet);

        let account = connection.get_account(&position_pda).map_err(|e| {
            SolanaError::AccountNotFound(format!("Failed to fetch position: {}", e))
        })?;

        let account_data = account.data;

        if account_data.len() < 8 {
            return Ok(None);
        }

        Ok(None) // Needs proper deserialization
    }

    /// Get user vault balance
    pub fn get_user_vault_balance(
        &self,
        user_wallet: &Pubkey,
        token_mint: &Pubkey,
    ) -> Result<u64, SolanaError> {
        let connection = self.program.get_connection();
        let (vault_token_account_pda, _) =
            get_user_vault_token_account_pda(&self.program_id, user_wallet, token_mint);

        let account = connection
            .get_account(&vault_token_account_pda)
            .map_err(|e| {
                SolanaError::AccountNotFound(format!("Failed to fetch vault account: {}", e))
            })?;

        let account_data = account.data;

        if account_data.is_empty() {
            return Ok(0);
        }

        // Deserialize token account (skip 8-byte discriminator for Anchor accounts)
        // For SPL Token accounts, the format is different
        // This is a simplified version - in production, use proper SPL Token deserialization
        if account_data.len() < 72 {
            return Ok(0);
        }

        // Token account amount is at offset 64 (after mint, owner, amount starts at 64)
        let amount_bytes: [u8; 8] = account_data[64..72].try_into().map_err(|_| {
            SolanaError::InvalidAccountData("Invalid token account data".to_string())
        })?;
        let amount = u64::from_le_bytes(amount_bytes);

        Ok(amount)
    }
}
