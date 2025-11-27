use crate::solana::{errors::SolanaError, pda::*, program::SolanaProgram};
use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Signature, Signer},
    system_program,
    transaction::Transaction,
};
use std::io::{Cursor, Read};
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

    /// Build a partially-signed createUser transaction
    /// Backend signs as payer, returns serialized tx for frontend to sign as user
    pub fn build_create_user_tx(
        &self,
        user_wallet: &Pubkey,
    ) -> Result<(String, Pubkey), SolanaError> {
        let payer = self.program.get_payer();

        // Derive PDAs
        let (config_pda, _) = get_config_pda(&self.program_id);
        let (user_account_pda, _) = get_user_account_pda(&self.program_id, user_wallet);

        // Build instruction accounts in exact order from IDL
        // create_user accounts: user (signer), payer (signer), user_account (PDA), config (PDA), system_program
        let accounts = vec![
            AccountMeta::new(*user_wallet, true), // user (signer) - will be signed by frontend
            AccountMeta::new(payer.pubkey(), true), // payer (signer) - signed by backend
            AccountMeta::new(user_account_pda, false), // user_account (PDA, writable)
            AccountMeta::new(config_pda, false),  // config (PDA, writable)
            AccountMeta::new_readonly(system_program::id(), false), // system_program
        ];

        // Build instruction data
        // Discriminator for create_user: [108, 227, 130, 130, 252, 109, 75, 218]
        let instruction_data = vec![108u8, 227, 130, 130, 252, 109, 75, 218];

        let instruction = Instruction {
            program_id: self.program_id,
            accounts,
            data: instruction_data,
        };

        // Create transaction with backend as fee payer
        let mut transaction = Transaction::new_with_payer(
            &[instruction],
            Some(&payer.pubkey()), // Backend pays fees
        );

        // Get recent blockhash
        let connection_service = self.program.get_connection_service();
        let recent_blockhash = connection_service.get_latest_blockhash()?;
        transaction.message.recent_blockhash = recent_blockhash;

        // Partially sign with backend payer (user will sign on frontend)
        transaction.partial_sign(&[payer.as_ref()], recent_blockhash);

        // Serialize transaction (requireAllSignatures: false because user hasn't signed yet)
        let serialized = transaction
            .serialize()
            .map_err(|e| SolanaError::TransactionError(format!("Failed to serialize: {}", e)))?;

        // Encode as base64 for JSON transport
        use base64::{Engine as _, engine::general_purpose};
        let base64_tx = general_purpose::STANDARD.encode(&serialized);

        Ok((base64_tx, user_account_pda))
    }

    /// Create a user account on-chain
    /// NOTE: This method is deprecated - use build_create_user_tx for multi-sig flow
    pub fn create_user(&self, user_wallet: &Pubkey) -> Result<Signature, SolanaError> {
        let connection = self.program.get_connection();
        let payer = self.program.get_payer();

        // Derive PDAs
        let (config_pda, _) = get_config_pda(&self.program_id);
        let (user_account_pda, _) = get_user_account_pda(&self.program_id, user_wallet);

        // Build instruction accounts in the exact order from IDL
        // create_user accounts: user (signer), payer (signer), user_account (PDA), config (PDA), system_program
        let accounts = vec![
            AccountMeta::new(*user_wallet, true),      // user (signer)
            AccountMeta::new(payer.pubkey(), true),    // payer (signer)
            AccountMeta::new(user_account_pda, false), // user_account (PDA, writable)
            AccountMeta::new(config_pda, false),       // config (PDA, writable)
            AccountMeta::new_readonly(system_program::id(), false), // system_program
        ];

        // Build instruction data
        // Discriminator for create_user: [108, 227, 130, 130, 252, 109, 75, 218]
        // No args for create_user
        let instruction_data = vec![108u8, 227, 130, 130, 252, 109, 75, 218];

        let instruction = Instruction {
            program_id: self.program_id,
            accounts,
            data: instruction_data,
        };

        let mut transaction = Transaction::new_with_payer(&[instruction], Some(&payer.pubkey()));

        let connection_service = self.program.get_connection_service();
        let recent_blockhash = connection_service.get_latest_blockhash()?;

        // TODO: The program currently requires `user: Signer<'info>`, but according to the architecture,
        // we should be able to create the user account with just the backend payer signing.
        // The program needs to be updated to make the user signer optional or allow the payer to sign instead.
        // For now, this will fail because we can't sign as the user from the backend.
        //
        // The program should be updated to:
        // - Remove the `user: Signer<'info>` constraint, OR
        // - Allow the payer to act as the user signer
        //
        // Once updated, we can sign with just the payer:
        transaction.sign(&[payer], recent_blockhash);

        let signature = connection
            .send_and_confirm_transaction(&transaction)
            .map_err(|e| {
                SolanaError::TransactionError(format!(
                    "Failed to send create_user transaction: {}",
                    e
                ))
            })?;

        Ok(signature)
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
        voter_wallet: &Pubkey,
        post_id_hash: [u8; 32],
        side: u8, // 0 = Pump, 1 = Smack
        votes: u64,
        token_mint: &Pubkey,
    ) -> Result<Signature, SolanaError> {
        let connection = self.program.get_connection();
        let payer = self.program.get_payer();

        // First, get the post account to get creator_user
        let post_account = self
            .get_post_account(post_id_hash)?
            .ok_or_else(|| SolanaError::AccountNotFound("Post account not found".to_string()))?;

        // Derive all PDAs
        let (config_pda, _) = get_config_pda(&self.program_id);
        let (post_pda, _) = get_post_pda(&self.program_id, &post_id_hash);
        let (voter_user_account_pda, _) = get_user_account_pda(&self.program_id, voter_wallet);
        let (voter_vault_token_account_pda, _) =
            get_user_vault_token_account_pda(&self.program_id, voter_wallet, token_mint);
        let (position_pda, _) = get_position_pda(&self.program_id, &post_pda, voter_wallet);
        let (vault_authority_pda, _) = get_vault_authority_pda(&self.program_id);
        let (post_pot_token_account_pda, _) =
            get_post_pot_token_account_pda(&self.program_id, &post_pda, token_mint);
        let (post_pot_authority_pda, _) = get_post_pot_authority_pda(&self.program_id, &post_pda);
        let (protocol_treasury_token_account_pda, _) =
            get_protocol_treasury_token_account_pda(&self.program_id, token_mint);
        let (creator_vault_token_account_pda, _) = get_user_vault_token_account_pda(
            &self.program_id,
            &post_account.creator_user,
            token_mint,
        );
        let (valid_payment_pda, _) = get_valid_payment_pda(&self.program_id, token_mint);

        // Build instruction accounts in the exact order from IDL
        let accounts = vec![
            AccountMeta::new(config_pda, false),    // config
            AccountMeta::new(*voter_wallet, true),  // voter (signer)
            AccountMeta::new(payer.pubkey(), true), // payer (signer)
            AccountMeta::new(post_pda, false),      // post
            AccountMeta::new_readonly(voter_user_account_pda, false), // voter_user_account
            AccountMeta::new(voter_vault_token_account_pda, false), // voter_user_vault_token_account
            AccountMeta::new(position_pda, false),                  // position
            AccountMeta::new_readonly(vault_authority_pda, false),  // vault_authority
            AccountMeta::new(post_pot_token_account_pda, false),    // post_pot_token_account
            AccountMeta::new_readonly(post_pot_authority_pda, false), // post_pot_authority
            AccountMeta::new(protocol_treasury_token_account_pda, false), // protocol_token_treasury_token_account
            AccountMeta::new(creator_vault_token_account_pda, false), // creator_vault_token_account
            AccountMeta::new_readonly(valid_payment_pda, false),      // valid_payment
            AccountMeta::new_readonly(*token_mint, false),            // token_mint
            AccountMeta::new_readonly(anchor_spl::token::spl_token::ID, false), // token_program
            AccountMeta::new_readonly(system_program::id(), false),   // system_program
        ];

        // Build instruction data
        // Discriminator for vote_on_post: [220, 160, 255, 192, 61, 83, 169, 65]
        let mut instruction_data = vec![220u8, 160, 255, 192, 61, 83, 169, 65];
        // side: enum (1 byte: 0 = Pump, 1 = Smack)
        instruction_data.push(side);
        // votes: u64 (8 bytes, little-endian)
        instruction_data.extend_from_slice(&votes.to_le_bytes());
        // post_id_hash: [u8; 32]
        instruction_data.extend_from_slice(&post_id_hash);

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

        // Minimum size check: discriminator (8) + creator_user (32) + post_id_hash (32) + post_type (1) + start_time (8) + end_time (8) + state (1) + upvotes (8) + downvotes (8) + winning_side (1-2)
        if account_data.len() < 8 + 32 + 32 + 1 + 8 + 8 + 1 + 8 + 8 + 1 {
            return Ok(None);
        }

        let mut cursor = Cursor::new(&account_data[8..]); // Skip discriminator

        // creator_user: Pubkey (32 bytes)
        let creator_user_bytes: [u8; 32] = {
            let mut buf = [0u8; 32];
            cursor.read_exact(&mut buf).map_err(|e| {
                SolanaError::InvalidAccountData(format!("Failed to read creator_user: {}", e))
            })?;
            buf
        };
        let creator_user = Pubkey::from(creator_user_bytes);

        // post_id_hash: [u8; 32]
        let mut post_id_hash_bytes = [0u8; 32];
        cursor.read_exact(&mut post_id_hash_bytes).map_err(|e| {
            SolanaError::InvalidAccountData(format!("Failed to read post_id_hash: {}", e))
        })?;

        // post_type: enum (1 byte for variant, then optional parent Pubkey if Child)
        let post_type_variant = {
            let mut buf = [0u8; 1];
            cursor.read_exact(&mut buf).map_err(|e| {
                SolanaError::InvalidAccountData(format!("Failed to read post_type: {}", e))
            })?;
            buf[0]
        };
        // If post_type is Child (1), skip the parent Pubkey (32 bytes)
        if post_type_variant == 1 {
            cursor.set_position(cursor.position() + 32);
        }

        // start_time: i64 (8 bytes, little-endian)
        let start_time = {
            let mut buf = [0u8; 8];
            cursor.read_exact(&mut buf).map_err(|e| {
                SolanaError::InvalidAccountData(format!("Failed to read start_time: {}", e))
            })?;
            i64::from_le_bytes(buf)
        };

        // end_time: i64 (8 bytes, little-endian)
        let end_time = {
            let mut buf = [0u8; 8];
            cursor.read_exact(&mut buf).map_err(|e| {
                SolanaError::InvalidAccountData(format!("Failed to read end_time: {}", e))
            })?;
            i64::from_le_bytes(buf)
        };

        // state: enum (1 byte: 0 = Open, 1 = Settled)
        let state = {
            let mut buf = [0u8; 1];
            cursor.read_exact(&mut buf).map_err(|e| {
                SolanaError::InvalidAccountData(format!("Failed to read state: {}", e))
            })?;
            buf[0]
        };

        // upvotes: u64 (8 bytes, little-endian)
        let upvotes = {
            let mut buf = [0u8; 8];
            cursor.read_exact(&mut buf).map_err(|e| {
                SolanaError::InvalidAccountData(format!("Failed to read upvotes: {}", e))
            })?;
            u64::from_le_bytes(buf)
        };

        // downvotes: u64 (8 bytes, little-endian)
        let downvotes = {
            let mut buf = [0u8; 8];
            cursor.read_exact(&mut buf).map_err(|e| {
                SolanaError::InvalidAccountData(format!("Failed to read downvotes: {}", e))
            })?;
            u64::from_le_bytes(buf)
        };

        // winning_side: Option<Side> (1 byte for Some/None, then 1 byte for variant if Some)
        let winning_side = {
            let mut buf = [0u8; 1];
            cursor.read_exact(&mut buf).map_err(|e| {
                SolanaError::InvalidAccountData(format!(
                    "Failed to read winning_side option: {}",
                    e
                ))
            })?;
            if buf[0] == 1 {
                // Some variant
                let mut variant_buf = [0u8; 1];
                cursor.read_exact(&mut variant_buf).map_err(|e| {
                    SolanaError::InvalidAccountData(format!(
                        "Failed to read winning_side variant: {}",
                        e
                    ))
                })?;
                Some(variant_buf[0]) // 0 = Pump, 1 = Smack
            } else {
                None
            }
        };

        Ok(Some(PostAccount {
            creator_user,
            post_id_hash: post_id_hash_bytes,
            start_time,
            end_time,
            state,
            upvotes,
            downvotes,
            winning_side,
        }))
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

        // Minimum size: discriminator (8) + user (32) + social_score (8) + bump (1)
        if account_data.len() < 8 + 32 + 8 + 1 {
            return Ok(None);
        }

        let mut cursor = Cursor::new(&account_data[8..]); // Skip discriminator

        // user: Pubkey (32 bytes)
        let user_bytes: [u8; 32] = {
            let mut buf = [0u8; 32];
            cursor.read_exact(&mut buf).map_err(|e| {
                SolanaError::InvalidAccountData(format!("Failed to read user: {}", e))
            })?;
            buf
        };
        let user = Pubkey::from(user_bytes);

        // social_score: i64 (8 bytes, little-endian)
        let social_score = {
            let mut buf = [0u8; 8];
            cursor.read_exact(&mut buf).map_err(|e| {
                SolanaError::InvalidAccountData(format!("Failed to read social_score: {}", e))
            })?;
            i64::from_le_bytes(buf)
        };

        // bump: u8 (1 byte)
        let bump = {
            let mut buf = [0u8; 1];
            cursor.read_exact(&mut buf).map_err(|e| {
                SolanaError::InvalidAccountData(format!("Failed to read bump: {}", e))
            })?;
            buf[0]
        };

        Ok(Some(UserAccount {
            user,
            social_score,
            bump,
        }))
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

        // Minimum size: discriminator (8) + user (32) + post (32) + upvotes (8) + downvotes (8)
        if account_data.len() < 8 + 32 + 32 + 8 + 8 {
            return Ok(None);
        }

        let mut cursor = Cursor::new(&account_data[8..]); // Skip discriminator

        // user: Pubkey (32 bytes)
        let user_bytes: [u8; 32] = {
            let mut buf = [0u8; 32];
            cursor.read_exact(&mut buf).map_err(|e| {
                SolanaError::InvalidAccountData(format!("Failed to read user: {}", e))
            })?;
            buf
        };
        let user = Pubkey::from(user_bytes);

        // post: Pubkey (32 bytes)
        let post_bytes: [u8; 32] = {
            let mut buf = [0u8; 32];
            cursor.read_exact(&mut buf).map_err(|e| {
                SolanaError::InvalidAccountData(format!("Failed to read post: {}", e))
            })?;
            buf
        };
        let post = Pubkey::from(post_bytes);

        // upvotes: u64 (8 bytes, little-endian)
        let upvotes = {
            let mut buf = [0u8; 8];
            cursor.read_exact(&mut buf).map_err(|e| {
                SolanaError::InvalidAccountData(format!("Failed to read upvotes: {}", e))
            })?;
            u64::from_le_bytes(buf)
        };

        // downvotes: u64 (8 bytes, little-endian)
        let downvotes = {
            let mut buf = [0u8; 8];
            cursor.read_exact(&mut buf).map_err(|e| {
                SolanaError::InvalidAccountData(format!("Failed to read downvotes: {}", e))
            })?;
            u64::from_le_bytes(buf)
        };

        Ok(Some(UserPostPosition {
            user,
            post,
            upvotes,
            downvotes,
        }))
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

        // If account doesn't exist, return 0 (user hasn't created account or deposited yet)
        // This is a normal state, not an error
        let account = match connection.get_account(&vault_token_account_pda) {
            Ok(acc) => acc,
            Err(_) => return Ok(0),
        };

        if account.data.len() < 72 {
            return Ok(0);
        }

        // Token account amount is at offset 64 (after mint, owner, amount starts at 64)
        let amount_bytes: [u8; 8] = account.data[64..72]
            .try_into()
            .map_err(|_| SolanaError::InvalidAccountData("Invalid token account".to_string()))?;

        Ok(u64::from_le_bytes(amount_bytes))
    }
}
