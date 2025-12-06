use std::collections::HashMap;
use std::fs;

use anchor_client::anchor_lang::solana_program::example_mocks::solana_sdk::system_instruction;
use anchor_client::anchor_lang::solana_program::example_mocks::solana_sdk::system_program;
use anchor_spl::associated_token::spl_associated_token_account::instruction::create_associated_token_account;
use anchor_spl::{
    associated_token::spl_associated_token_account::{self},
    token::spl_token,
};
use opinions_market::state::Side;
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::{
    ed25519_instruction,
    instruction::Instruction,
    message::{VersionedMessage, v0::Message},
    native_token::LAMPORTS_PER_SOL,
    program_pack::Pack,
    signature::{Keypair, Signature},
    signers::Signers,
    sysvar::instructions::ID as INSTRUCTIONS_SYSVAR_ID,
    transaction::VersionedTransaction,
}; // Add this import
use solana_sdk::{pubkey::Pubkey, signer::Signer};

use anchor_client::Client;
use anchor_client::Cluster;
use anchor_client::Program;

use serde_json::Value;

use anchor_client::anchor_lang::prelude::*;

use base64::{Engine as _, engine::general_purpose};
use bincode;
use hex;
use solana_sdk::commitment_config::CommitmentConfig;
use std::sync::Arc;

use opinions_market::accounts::*;
use opinions_market::instructions::*;

use crate::solana::get_config_pda;
use crate::solana::{
    get_position_pda, get_post_mint_payout_pda, get_post_pda, get_post_pot_authority_pda,
    get_post_pot_token_account_pda, get_protocol_treasury_token_account_pda,
    get_session_authority_pda, get_user_account_pda, get_user_post_mint_claim_pda,
    get_user_vault_token_account_pda, get_valid_payment_pda, get_vault_authority_pda,
};

pub struct SolanaService {
    rpc: Arc<RpcClient>,
    session_key: Keypair,
    payer: Arc<Keypair>,
    program_id: Pubkey,
    bling_mint: Pubkey,
}

fn read_program_id_from_idl() -> Pubkey {
    // Read SOLANA_NETWORK env var (default to "localnet" if not set)
    let network = std::env::var("SOLANA_NETWORK").unwrap_or_else(|_| "localnet".to_string());

    let idl_path = format!("src/solana/target/{}/idl/opinions_market.json", network);
    let file = fs::read_to_string(&idl_path).unwrap_or_else(|_| {
        panic!(
            "IDL file not found at: {}. Make sure SOLANA_NETWORK is set correctly and IDL exists.",
            idl_path
        )
    });

    let v: Value = serde_json::from_str(&file).expect("Invalid JSON in IDL");

    let addr = v["address"].as_str().expect("IDL missing address field");

    addr.parse().expect("Invalid program ID format")
}

impl SolanaService {
    pub fn new(
        rpc: Arc<RpcClient>,
        session_key: Keypair,
        payer: Arc<Keypair>,
        bling_mint: Pubkey,
    ) -> Self {
        let program_id = read_program_id_from_idl();

        Self {
            rpc,
            session_key,
            payer,
            program_id,
            bling_mint,
        }
    }

    pub fn get_bling_mint(&self) -> &Pubkey {
        &self.bling_mint
    }

    pub fn payer_pubkey(&self) -> Pubkey {
        self.payer.pubkey()
    }

    pub fn session_key_pubkey(&self) -> Pubkey {
        self.session_key.pubkey()
    }

    /// Send a fully-signed transaction (signed by backend and/or session)
    pub async fn send_signed_tx(&self, tx: &VersionedTransaction) -> anyhow::Result<Signature> {
        let result = self.rpc.send_and_confirm_transaction(tx).await;

        match result {
            Err(e) => {
                eprintln!("❌ Transaction failed: {}", e);
                Err(e.into())
            }
            Ok(signature) => {
                // Verify the transaction actually succeeded
                let status = self.rpc.get_signature_status(&signature).await?;

                if let Some(transaction_status) = status {
                    if let Some(err) = transaction_status.err() {
                        return Err(anyhow::anyhow!("Transaction failed: {:?}", err));
                    }
                }

                Ok(signature)
            }
        }
    }

    /// Get opinions_market_program using the async Anchor client (no nested runtimes)
    pub fn opinions_market_program(&self) -> Program<Arc<Keypair>> {
        // Read SOLANA_NETWORK env var to determine cluster (default to "localnet" if not set)
        let network = std::env::var("SOLANA_NETWORK").unwrap_or_else(|_| "localnet".to_string());

        let cluster = match network.as_str() {
            "devnet" => Cluster::Devnet,
            "mainnet" => Cluster::Mainnet,
            "localnet" | _ => Cluster::Localnet,
        };

        let client =
            Client::new_with_options(cluster, self.payer.clone(), CommitmentConfig::confirmed());
        client
            .program(self.program_id)
            .expect("Failed to init program")
    }

    /// Build a partially-signed transaction with the backend payer as signer
    pub async fn build_partial_signed_tx(
        &self,
        ixs: Vec<Instruction>,
    ) -> anyhow::Result<VersionedTransaction> {
        let blockhash = self.rpc.get_latest_blockhash().await?;
        let message = Message::try_compile(&self.payer.pubkey(), &ixs, &[], blockhash)?;
        let v0_message = VersionedMessage::V0(message);
        let signers: [&Keypair; 1] = [self.payer.as_ref()];
        let tx = VersionedTransaction::try_new(v0_message, &signers)?;

        Ok(tx)
    }

    pub async fn send_tx<T: Signers + ?Sized>(
        &self,
        ixs: Vec<Instruction>,
        signer: &T,
    ) -> anyhow::Result<Signature> {
        let blockhash = self.rpc.get_latest_blockhash().await?;
        let message = Message::try_compile(&self.payer.pubkey(), &ixs, &[], blockhash)?;
        let v0_message = VersionedMessage::V0(message);
        let tx = VersionedTransaction::try_new(v0_message, signer)?;

        let result = self.rpc.send_and_confirm_transaction(&tx).await;

        // inspect error if any
        match result {
            Err(e) => {
                // eprintln!("❌ Transaction failed: {:#?}", e);
                eprintln!("❌ Transaction failed: {}", e);
                return Err(e.into());
            }
            Ok(signature) => {
                // Verify the transaction actually succeeded
                let status = self.rpc.get_signature_status(&signature).await?;

                if let Some(transaction_status) = status {
                    if let Some(err) = transaction_status.err() {
                        return Err(anyhow::anyhow!("Transaction failed: {:?}", err));
                    }
                }

                Ok(signature)
            }
        }
    }

    /// Submit a user-signed transaction (deserialize, optionally re-sign, and broadcast)
    pub async fn submit_user_signed_tx(&self, tx_base64: String) -> anyhow::Result<Signature> {
        // Deserialize VersionedTransaction from base64
        let tx_bytes = general_purpose::STANDARD
            .decode(&tx_base64)
            .map_err(|e| anyhow::anyhow!("Invalid base64: {}", e))?;

        let tx: VersionedTransaction = bincode::deserialize(&tx_bytes)
            .map_err(|e| anyhow::anyhow!("Failed to deserialize transaction: {}", e))?;

        // Transaction is already signed by both backend payer and user
        // No need to re-sign - just broadcast it
        // Broadcast transaction
        let result = self.rpc.send_and_confirm_transaction(&tx).await;

        match result {
            Err(e) => {
                eprintln!("❌ Transaction failed: {}", e);
                Err(e.into())
            }
            Ok(signature) => {
                // Verify the transaction actually succeeded
                let status = self.rpc.get_signature_status(&signature).await?;

                if let Some(transaction_status) = status {
                    if let Some(err) = transaction_status.err() {
                        return Err(anyhow::anyhow!("Transaction failed: {:?}", err));
                    }
                }

                Ok(signature)
            }
        }
    }

    pub async fn get_user_account(
        &self,
        user_wallet: &Pubkey,
    ) -> anyhow::Result<Option<opinions_market::state::UserAccount>> {
        let opinions_market = self.opinions_market_program();
        let (user_account_pda, _) = get_user_account_pda(&self.program_id, user_wallet);

        match opinions_market
            .account::<opinions_market::state::UserAccount>(user_account_pda)
            .await
        {
            Ok(user_account) => Ok(Some(user_account)),
            Err(_) => Ok(None), // Account doesn't exist
        }
    }

    pub async fn get_user_vault_balance(
        &self,
        user_wallet: &Pubkey,
        token_mint: &Pubkey,
    ) -> anyhow::Result<u64> {
        let (vault_token_account_pda, _) =
            get_user_vault_token_account_pda(&self.program_id, user_wallet, token_mint);

        let account = match self.rpc.get_account(&vault_token_account_pda).await {
            Ok(account) => account,
            Err(e) => {
                let msg = e.to_string();
                if msg.contains("AccountNotFound") || msg.contains("not found") {
                    return Ok(0);
                }
                return Err(anyhow::anyhow!("Failed to get account: {}", e));
            }
        };

        // SPL Token decoding
        let token_account = spl_token::state::Account::unpack_from_slice(&account.data)
            .map_err(|_| anyhow::anyhow!("Invalid token account data"))?;

        Ok(token_account.amount)
    }

    /// Get post pot balance for a specific token mint
    pub async fn get_post_pot_balance(
        &self,
        post_id_hash: &[u8; 32],
        token_mint: &Pubkey,
    ) -> anyhow::Result<u64> {
        let program = self.opinions_market_program();
        let program_id = program.id();
        let (post_pda, _) = get_post_pda(&program_id, post_id_hash);
        let (post_pot_token_account_pda, _) =
            get_post_pot_token_account_pda(&program_id, &post_pda, token_mint);

        let account = match self.rpc.get_account(&post_pot_token_account_pda).await {
            Ok(account) => account,
            Err(e) => {
                let msg = e.to_string();
                if msg.contains("AccountNotFound") || msg.contains("not found") {
                    return Ok(0); // Pot doesn't exist yet (no votes in this token)
                }
                return Err(anyhow::anyhow!("Failed to get post pot account: {}", e));
            }
        };

        // SPL Token decoding
        let token_account = spl_token::state::Account::unpack_from_slice(&account.data)
            .map_err(|_| anyhow::anyhow!("Invalid token account data"))?;

        Ok(token_account.amount)
    }

    /// Get user's position (vote counts) for a specific post
    pub async fn get_user_position(
        &self,
        user_wallet: &Pubkey,
        post_id_hash: &[u8; 32],
    ) -> anyhow::Result<Option<opinions_market::state::UserPostPosition>> {
        let program = self.opinions_market_program();
        let program_id = program.id();
        let (post_pda, _) = get_post_pda(&program_id, post_id_hash);
        let (position_pda, _) = get_position_pda(&program_id, &post_pda, user_wallet);

        match program
            .account::<opinions_market::state::UserPostPosition>(position_pda)
            .await
        {
            Ok(position) => Ok(Some(position)),
            Err(_) => Ok(None), // Position doesn't exist yet (user hasn't voted)
        }
    }

    // pub async fn ping(&self) -> anyhow::Result<String> {
    //     let opinions_market = self.opinions_market_program;

    //     let ix = opinions_market
    //         .request()
    //         .accounts(opinions_market::accounts::Ping {})
    //         .args(opinions_market::instruction::Ping {})
    //         .instructions()
    //         .unwrap();

    //     let tx = self.send_tx(ix, &[&self.payer]).await?;

    //     Ok(tx.to_string())
    // }

    /// Onboard user: Chain create_user + ed25519_verify + register_session in one transaction
    ///
    /// This method creates the user account, verifies the signature, and registers the session
    /// all in a single atomic transaction. The instructions must be in this order:
    /// 0. create_user - creates UserAccount PDA
    /// 1. ed25519_verify - verifies signature and writes to instruction sysvar
    /// 2. register_session - reads UserAccount and instruction sysvar, creates session_authority PDA
    pub async fn onboard_user_with_session(
        &self,
        user_wallet: Pubkey,
        session_key: Pubkey,
        signature_bytes: [u8; 64],
        message_bytes: Vec<u8>,
    ) -> anyhow::Result<Signature> {
        println!(
            "  🔧 SolanaService::onboard_user_with_session: Starting for user {}, session_key {}",
            user_wallet, session_key
        );

        let program = self.opinions_market_program();
        let program_id = program.id();
        println!(
            "  📍 SolanaService::onboard_user_with_session: Program ID: {}",
            program_id
        );

        // Derive PDAs
        let (config_pda, _) = get_config_pda(&program_id);
        let (user_account_pda, _) = get_user_account_pda(&program_id, &user_wallet);
        let (session_authority_pda, _) =
            get_session_authority_pda(&program_id, &user_wallet, &session_key);
        println!(
            "  📍 SolanaService::onboard_user_with_session: Config PDA: {}",
            config_pda
        );
        println!(
            "  📍 SolanaService::onboard_user_with_session: User Account PDA: {}",
            user_account_pda
        );
        println!(
            "  📍 SolanaService::onboard_user_with_session: Session Authority PDA: {}",
            session_authority_pda
        );
        println!(
            "  💰 SolanaService::onboard_user_with_session: Payer: {}",
            self.payer.pubkey()
        );

        // Instruction 0: CreateUser
        println!(
            "  🔨 SolanaService::onboard_user_with_session: Building CreateUser instruction..."
        );
        let create_user_ix = program
            .request()
            .accounts(opinions_market::accounts::CreateUser {
                config: config_pda,
                user: user_wallet,
                payer: self.payer.pubkey(),
                user_account: user_account_pda,
                system_program: solana_sdk::system_program::ID,
            })
            .args(opinions_market::instruction::CreateUser {})
            .instructions()
            .map_err(|e| {
                eprintln!(
                    "  ❌ SolanaService::onboard_user_with_session: Failed to build CreateUser instruction: {}",
                    e
                );
                anyhow::anyhow!("Failed to build CreateUser instruction: {}", e)
            })?;
        println!("  ✅ SolanaService::onboard_user_with_session: CreateUser instruction built");

        // Instruction 1: ed25519_verify (must be at index 1, register_session expects it at index 1)
        println!("  🔨 SolanaService::onboard_user_with_session: Building ed25519 instruction...");
        let ed25519_ix = ed25519_instruction::new_ed25519_instruction_with_signature(
            &message_bytes,
            &signature_bytes,
            &user_wallet.to_bytes(),
        );
        println!("  ✅ SolanaService::onboard_user_with_session: ed25519 instruction built");

        // Instruction 2: RegisterSession (expects ed25519 at index 1)
        println!(
            "  🔨 SolanaService::onboard_user_with_session: Building RegisterSession instruction..."
        );
        let register_session_ix = program
            .request()
            .accounts(opinions_market::accounts::RegisterSession {
                payer: self.payer.pubkey(),
                user: user_wallet,
                session_key,
                session_authority: session_authority_pda,
                instructions_sysvar: INSTRUCTIONS_SYSVAR_ID,
                system_program: solana_sdk::system_program::ID,
            })
            .args(opinions_market::instruction::RegisterSession { expected_index: 1 })
            .instructions()
            .map_err(|e| {
                eprintln!(
                    "  ❌ SolanaService::onboard_user_with_session: Failed to build RegisterSession instruction: {}",
                    e
                );
                anyhow::anyhow!("Failed to build RegisterSession instruction: {}", e)
            })?;
        println!(
            "  ✅ SolanaService::onboard_user_with_session: RegisterSession instruction built"
        );

        // Chain all instructions: create_user (0), ed25519_verify (1), register_session (2)
        let mut instructions = create_user_ix;
        instructions.push(ed25519_ix);
        instructions.extend(register_session_ix);

        println!(
            "  ✍️  SolanaService::onboard_user_with_session: Building and signing transaction with payer..."
        );
        let tx = self
            .build_partial_signed_tx(instructions)
            .await
            .map_err(|e| {
                eprintln!(
                    "  ❌ SolanaService::onboard_user_with_session: Failed to build transaction: {}",
                    e
                );
                e
            })?;

        println!("  ✅ SolanaService::onboard_user_with_session: Transaction built and signed");

        // Send and confirm transaction
        println!(
            "  📡 SolanaService::onboard_user_with_session: Sending transaction to network..."
        );
        let signature = self.send_signed_tx(&tx).await.map_err(|e| {
            eprintln!(
                "  ❌ SolanaService::onboard_user_with_session: Failed to send transaction: {}",
                e
            );
            e
        })?;

        println!(
            "  ✅ SolanaService::onboard_user_with_session: Transaction confirmed! Signature: {}",
            signature
        );
        Ok(signature)
    }

    /// [DEPRECATED] Create a user account on-chain, signed by backend payer only
    ///
    /// This method is deprecated. The `onboardUser` GraphQL mutation should be used instead,
    /// which handles user creation, session registration, and profile creation in a single flow.
    ///
    /// This method only creates the on-chain account and does not handle:
    /// - MongoDB user creation
    /// - Session key registration
    /// - Profile creation
    pub async fn create_user(&self, user_wallet: Pubkey) -> anyhow::Result<Signature> {
        eprintln!(
            "  ⚠️  [DEPRECATED] SolanaService::create_user called for user {}. Use onboardUser mutation instead.",
            user_wallet
        );
        println!(
            "  🔧 SolanaService::create_user: Starting for user {}",
            user_wallet
        );

        let program = self.opinions_market_program();
        let program_id = program.id();
        println!(
            "  📍 SolanaService::create_user: Program ID: {}",
            program_id
        );

        // Derive PDAs
        let (config_pda, _) = get_config_pda(&program_id);
        let (user_account_pda, _) = get_user_account_pda(&program_id, &user_wallet);
        println!(
            "  📍 SolanaService::create_user: Config PDA: {}",
            config_pda
        );
        println!(
            "  📍 SolanaService::create_user: User Account PDA: {}",
            user_account_pda
        );
        println!(
            "  💰 SolanaService::create_user: Payer: {}",
            self.payer.pubkey()
        );

        // Build CreateUser instruction
        println!("  🔨 SolanaService::create_user: Building CreateUser instruction...");
        let ixs = program
            .request()
            .accounts(opinions_market::accounts::CreateUser {
                config: config_pda,
                user: user_wallet,
                payer: self.payer.pubkey(),
                user_account: user_account_pda,
                system_program: solana_sdk::system_program::ID,
            })
            .args(opinions_market::instruction::CreateUser {})
            .instructions()
            .map_err(|e| {
                eprintln!(
                    "  ❌ SolanaService::create_user: Failed to build instruction: {}",
                    e
                );
                anyhow::anyhow!("Failed to build CreateUser instruction: {}", e)
            })?;

        println!("  ✅ SolanaService::create_user: Instruction built successfully");

        // Build transaction signed by payer only
        println!(
            "  ✍️  SolanaService::create_user: Building and signing transaction with payer..."
        );
        let tx = self.build_partial_signed_tx(ixs).await.map_err(|e| {
            eprintln!(
                "  ❌ SolanaService::create_user: Failed to build transaction: {}",
                e
            );
            e
        })?;

        println!("  ✅ SolanaService::create_user: Transaction built and signed");

        // Send and confirm transaction
        println!("  📡 SolanaService::create_user: Sending transaction to network...");
        let signature = self.send_signed_tx(&tx).await.map_err(|e| {
            eprintln!(
                "  ❌ SolanaService::create_user: Failed to send transaction: {}",
                e
            );
            e
        })?;

        println!(
            "  ✅ SolanaService::create_user: Transaction confirmed! Signature: {}",
            signature
        );
        Ok(signature)
    }

    /// Renew a session for a user with ed25519 signature verification
    ///
    /// This is used when the user already has an on-chain account and just needs to renew their session.
    /// For new users, use onboard_user_with_session instead.
    pub async fn renew_session(
        &self,
        user_wallet: Pubkey,
        session_key: Pubkey,
        signature_bytes: [u8; 64],
        message_bytes: Vec<u8>,
    ) -> anyhow::Result<Signature> {
        println!(
            "  🔧 SolanaService::renew_session: Starting for user {}, session_key {}",
            user_wallet, session_key
        );

        let program = self.opinions_market_program();
        let program_id = program.id();
        println!(
            "  📍 SolanaService::renew_session: Program ID: {}",
            program_id
        );

        // Derive session authority PDA
        let (session_authority_pda, _) =
            get_session_authority_pda(&program_id, &user_wallet, &session_key);
        println!(
            "  📍 SolanaService::renew_session: Session Authority PDA: {}",
            session_authority_pda
        );

        // Create ed25519 instruction (must be first in transaction, index 0)
        println!("  🔨 SolanaService::renew_session: Building ed25519 instruction...");
        let ed25519_ix = ed25519_instruction::new_ed25519_instruction_with_signature(
            &message_bytes,
            &signature_bytes,
            &user_wallet.to_bytes(),
        );
        println!("  ✅ SolanaService::renew_session: ed25519 instruction built");

        // Create register_session instruction
        println!("  🔨 SolanaService::renew_session: Building RegisterSession instruction...");
        let register_session_ix = program
            .request()
            .accounts(opinions_market::accounts::RegisterSession {
                payer: self.payer.pubkey(),
                user: user_wallet,
                session_key,
                session_authority: session_authority_pda,
                instructions_sysvar: INSTRUCTIONS_SYSVAR_ID,
                system_program: solana_sdk::system_program::ID,
            })
            .args(opinions_market::instruction::RegisterSession { expected_index: 0 })
            .instructions()
            .map_err(|e| {
                eprintln!(
                    "  ❌ SolanaService::renew_session: Failed to build instruction: {}",
                    e
                );
                anyhow::anyhow!("Failed to build RegisterSession instruction: {}", e)
            })?;

        println!("  ✅ SolanaService::renew_session: RegisterSession instruction built");

        // Build transaction with ed25519 first, then register_session
        let mut instructions = vec![ed25519_ix];
        instructions.extend(register_session_ix);

        println!(
            "  ✍️  SolanaService::renew_session: Building and signing transaction with payer..."
        );
        let tx = self
            .build_partial_signed_tx(instructions)
            .await
            .map_err(|e| {
                eprintln!(
                    "  ❌ SolanaService::renew_session: Failed to build transaction: {}",
                    e
                );
                e
            })?;

        println!("  ✅ SolanaService::renew_session: Transaction built and signed");

        // Send and confirm transaction
        println!("  📡 SolanaService::renew_session: Sending transaction to network...");
        let signature = self.send_signed_tx(&tx).await.map_err(|e| {
            eprintln!(
                "  ❌ SolanaService::renew_session: Failed to send transaction: {}",
                e
            );
            e
        })?;

        println!(
            "  ✅ SolanaService::renew_session: Transaction confirmed! Signature: {}",
            signature
        );
        Ok(signature)
    }

    /// Create a post account on-chain, signed by backend payer only
    pub async fn create_post(
        &self,
        user_wallet: Pubkey,
        post_id_hash: [u8; 32],
        parent_post_pda: Option<Pubkey>,
    ) -> anyhow::Result<Signature> {
        // Log post type prominently
        if let Some(parent_pda) = parent_post_pda {
            eprintln!("  🌳 ========================================");
            eprintln!("  🌳 CHILD POST (REPLY) - Creating reply post");
            eprintln!("  🌳 Parent Post (Mother) PDA: {}", parent_pda);
            eprintln!("  🌳 ========================================");
        } else {
            eprintln!("  📝 ========================================");
            eprintln!("  📝 ORIGINAL POST - Creating original post");
            eprintln!("  📝 ========================================");
        }

        println!(
            "  🔧 SolanaService::create_post: Starting for user {}",
            user_wallet
        );

        let program = self.opinions_market_program();
        let program_id = program.id();
        println!(
            "  📍 SolanaService::create_post: Program ID: {}",
            program_id
        );

        // Derive PDAs
        let (config_pda, _) = get_config_pda(&program_id);
        let (user_account_pda, _) = get_user_account_pda(&program_id, &user_wallet);
        let (post_pda, _) = get_post_pda(&program_id, &post_id_hash);
        println!(
            "  📍 SolanaService::create_post: Config PDA: {}",
            config_pda
        );
        println!(
            "  📍 SolanaService::create_post: User Account PDA: {}",
            user_account_pda
        );
        println!("  📍 SolanaService::create_post: Post PDA: {}", post_pda);
        if let Some(parent) = parent_post_pda {
            println!(
                "  🌳 SolanaService::create_post: Parent Post (Mother) PDA: {}",
                parent
            );
        }
        println!(
            "  💰 SolanaService::create_post: Payer: {}",
            self.payer.pubkey()
        );

        println!(
            "  🔍 SolanaService::create_post: Session Key: {}",
            self.session_key.pubkey()
        );

        // Check if session_authority exists before proceeding
        let session_key = self.session_key.pubkey();
        let (session_authority_pda, _) =
            get_session_authority_pda(&program_id, &user_wallet, &session_key);

        println!(
            "  🔍 SolanaService::create_post: Checking if session_authority exists at {}",
            session_authority_pda
        );

        let session_exists = match self.rpc.get_account(&session_authority_pda).await {
            Ok(_) => {
                println!("  ✅ SolanaService::create_post: Session authority exists");
                true
            }
            Err(e) => {
                let msg = e.to_string();
                if msg.contains("AccountNotFound") || msg.contains("not found") {
                    println!("  ⚠️ SolanaService::create_post: Session authority does not exist");
                    false
                } else {
                    return Err(anyhow::anyhow!(
                        "Failed to check session_authority account: {}",
                        e
                    ));
                }
            }
        };

        if !session_exists {
            return Err(anyhow::anyhow!(
                "Session authority account does not exist for user {} with session_key {}. \
                Please register a session first by calling renewSession or onboardUser.",
                user_wallet,
                session_key
            ));
        }

        // Build CreatePost instruction
        println!("  🔨 SolanaService::create_post: Building CreatePost instruction...");

        let ixs = program
            .request()
            .accounts(opinions_market::accounts::CreatePost {
                config: config_pda,
                user: user_wallet,
                payer: self.payer.pubkey(),
                session_key: self.session_key.pubkey(),
                session_authority: session_authority_pda,
                user_account: user_account_pda,
                post: post_pda,
                system_program: solana_sdk::system_program::ID,
            })
            .args(opinions_market::instruction::CreatePost {
                post_id_hash,
                parent_post_pda,
            })
            .instructions()
            .map_err(|e| {
                eprintln!(
                    "  ❌ SolanaService::create_post: Failed to build instruction: {}",
                    e
                );
                anyhow::anyhow!("Failed to build CreatePost instruction: {}", e)
            })?;

        println!("  ✅ SolanaService::create_post: Instruction built successfully");

        // Build transaction signed by payer only
        println!(
            "  ✍️  SolanaService::create_post: Building and signing transaction with payer..."
        );
        let tx = self.build_partial_signed_tx(ixs).await.map_err(|e| {
            eprintln!(
                "  ❌ SolanaService::create_post: Failed to build transaction: {}",
                e
            );
            e
        })?;

        println!("  ✅ SolanaService::create_post: Transaction built and signed");

        // Send and confirm transaction
        println!("  📡 SolanaService::create_post: Sending transaction to network...");
        let signature = self.send_signed_tx(&tx).await.map_err(|e| {
            eprintln!(
                "  ❌ SolanaService::create_post: Failed to send transaction: {}",
                e
            );
            e
        })?;

        println!(
            "  ✅ SolanaService::create_post: Transaction confirmed! Signature: {}",
            signature
        );

        // Log completion with post type
        if parent_post_pda.is_some() {
            eprintln!(
                "  🌳 ✅ CHILD POST (REPLY) created successfully! Signature: {}",
                signature
            );
        } else {
            eprintln!(
                "  📝 ✅ ORIGINAL POST created successfully! Signature: {}",
                signature
            );
        }

        Ok(signature)
    }

    pub async fn vote_on_post(
        &self,
        voter_wallet: &Pubkey,
        post_id_hash: [u8; 32],
        side: Side,
        token_mint: &Pubkey,
        votes: u64,
    ) -> anyhow::Result<Signature> {
        println!(
            "  🔧 SolanaService::vote_on_post: Starting for user {}, post_id_hash: {}, side: {:?}, votes: {}, token_mint: {}",
            voter_wallet,
            hex::encode(post_id_hash),
            side,
            votes,
            token_mint
        );

        let program = self.opinions_market_program();
        let program_id = program.id();
        println!(
            "  📍 SolanaService::vote_on_post: Program ID: {}",
            program_id
        );

        // Derive PDAs
        let (config_pda, _) = get_config_pda(&program_id);
        let (voter_user_account_pda, _) = get_user_account_pda(&program_id, voter_wallet);
        let (post_pda, _) = get_post_pda(&program_id, &post_id_hash);
        let (voter_user_vault_token_account_pda, _) =
            get_user_vault_token_account_pda(&program_id, voter_wallet, token_mint);
        let (position_pda, _) = get_position_pda(&program_id, &post_pda, voter_wallet);
        let (vault_authority_pda, _) = get_vault_authority_pda(&program_id);
        let (post_pot_authority_pda, _) = get_post_pot_authority_pda(&program_id, &post_pda);
        let (post_pot_token_account_pda, _) =
            get_post_pot_token_account_pda(&program_id, &post_pda, token_mint);
        let (protocol_treasury_token_account_pda, _) =
            get_protocol_treasury_token_account_pda(&program_id, token_mint);
        let (valid_payment_pda, _) = get_valid_payment_pda(&program_id, token_mint);

        // Fetch post account to get creator_user
        let post_account = program
            .account::<opinions_market::state::PostAccount>(post_pda)
            .await
            .map_err(|e| {
                eprintln!(
                    "  ❌ SolanaService::vote_on_post: Failed to fetch post account: {}",
                    e
                );
                anyhow::anyhow!("Failed to fetch post account: {}", e)
            })?;

        let creator_user = post_account.creator_user;
        let (creator_vault_token_account_pda, _) =
            get_user_vault_token_account_pda(&program_id, &creator_user, token_mint);

        println!(
            "  📍 SolanaService::vote_on_post: Config PDA: {}",
            config_pda
        );
        println!(
            "  📍 SolanaService::vote_on_post: User Account PDA: {}",
            voter_user_account_pda
        );
        println!("  📍 SolanaService::vote_on_post: Post PDA: {}", post_pda);
        println!(
            "  📍 SolanaService::vote_on_post: User Vault Token Account PDA: {}",
            voter_user_vault_token_account_pda
        );
        println!(
            "  📍 SolanaService::vote_on_post: Position PDA: {}",
            position_pda
        );
        println!(
            "  📍 SolanaService::vote_on_post: Vault Authority PDA: {}",
            vault_authority_pda
        );
        println!(
            "  📍 SolanaService::vote_on_post: Post Pot Authority PDA: {}",
            post_pot_authority_pda
        );
        println!(
            "  📍 SolanaService::vote_on_post: Post Pot Token Account PDA: {}",
            post_pot_token_account_pda
        );
        println!(
            "  📍 SolanaService::vote_on_post: Protocol Treasury Token Account PDA: {}",
            protocol_treasury_token_account_pda
        );
        println!(
            "  📍 SolanaService::vote_on_post: Creator Vault Token Account PDA: {}",
            creator_vault_token_account_pda
        );
        println!(
            "  📍 SolanaService::vote_on_post: Valid Payment PDA: {}",
            valid_payment_pda
        );
        println!(
            "  📍 SolanaService::vote_on_post: Creator User: {}",
            creator_user
        );
        println!(
            "  💰 SolanaService::vote_on_post: Payer: {}",
            self.payer.pubkey()
        );

        // Build VoteOnPost instruction
        println!("  🔨 SolanaService::vote_on_post: Building VoteOnPost instruction...");
        // For now, use payer as session_key when no session is registered
        // TODO: Properly handle optional sessions
        let (session_authority_pda, _) =
            get_session_authority_pda(&program_id, voter_wallet, &self.session_key.pubkey());

        let ixs = program
            .request()
            .accounts(opinions_market::accounts::VoteOnPost {
                config: config_pda,
                voter: *voter_wallet,
                payer: self.payer.pubkey(),
                session_key: self.session_key.pubkey(),
                session_authority: session_authority_pda,
                post: post_pda,
                voter_user_account: voter_user_account_pda,
                voter_user_vault_token_account: voter_user_vault_token_account_pda,
                position: position_pda,
                vault_authority: vault_authority_pda,
                post_pot_token_account: post_pot_token_account_pda,
                post_pot_authority: post_pot_authority_pda,
                protocol_token_treasury_token_account: protocol_treasury_token_account_pda,
                creator_vault_token_account: creator_vault_token_account_pda,
                valid_payment: valid_payment_pda,
                token_mint: *token_mint,
                token_program: spl_token::ID,
                system_program: solana_sdk::system_program::ID,
            })
            .args(opinions_market::instruction::VoteOnPost {
                post_id_hash,
                side,
                votes,
            })
            .instructions()
            .map_err(|e| {
                eprintln!(
                    "  ❌ SolanaService::vote_on_post: Failed to build instruction: {}",
                    e
                );
                anyhow::anyhow!("Failed to build VoteOnPost instruction: {}", e)
            })?;

        println!("  ✅ SolanaService::vote_on_post: Instruction built successfully");

        // Build transaction signed by payer only
        println!(
            "  ✍️  SolanaService::vote_on_post: Building and signing transaction with payer..."
        );
        let tx = self.build_partial_signed_tx(ixs).await.map_err(|e| {
            eprintln!(
                "  ❌ SolanaService::vote_on_post: Failed to build transaction: {}",
                e
            );
            e
        })?;

        println!("  ✅ SolanaService::vote_on_post: Transaction built and signed");

        // Send and confirm transaction
        println!("  📡 SolanaService::vote_on_post: Sending transaction to network...");
        let signature = self.send_signed_tx(&tx).await.map_err(|e| {
            eprintln!(
                "  ❌ SolanaService::vote_on_post: Failed to send transaction: {}",
                e
            );
            e
        })?;

        println!(
            "  ✅ SolanaService::vote_on_post: Transaction confirmed! Signature: {}",
            signature
        );
        Ok(signature)
    }

    /// Get canonical vote cost for a user
    /// Fetches UserAccount and computes cost using the same logic as on-chain
    pub async fn get_canonical_cost(
        &self,
        user_wallet: &Pubkey,
        side: Side,
    ) -> anyhow::Result<u64> {
        println!(
            "  🔧 SolanaService::get_canonical_cost: Starting for user {}, side: {:?}",
            user_wallet, side
        );

        let program = self.opinions_market_program();
        let program_id = program.id();

        // Derive the UserAccount PDA
        let (user_account_pda, _) = get_user_account_pda(&program_id, user_wallet);

        // Fetch UserAccount
        let user_account: opinions_market::state::UserAccount =
            program.account(user_account_pda).await.map_err(|e| {
                anyhow::anyhow!(
                    "Failed to fetch UserAccount PDA {}: {}",
                    user_account_pda,
                    e
                )
            })?;

        // Compute canonical cost directly on UserAccount
        // This is a pure user attribute - no Vote struct needed
        let cost = user_account
            .canonical_cost(side)
            .map_err(|e| anyhow::anyhow!("Canonical cost compute error: {:?}", e))?;

        println!(
            "  ✅ SolanaService::get_canonical_cost: Cost = {} BLING lamports",
            cost
        );

        Ok(cost)
    }

    /// Convert a price in BLING lamports to another token using ValidPayment account
    /// Returns the equivalent amount in the target token's lamports
    ///
    /// Formula: token_lamports = (bling_lamports * 10^token_decimals) / (price_in_bling * 10^bling_decimals)
    /// where price_in_bling is the conversion rate (1 token = price_in_bling BLING in base units)
    pub async fn convert_bling_to_token(
        &self,
        bling_lamports: u64,
        target_token_mint: &Pubkey,
    ) -> anyhow::Result<u64> {
        println!(
            "  🔧 SolanaService::convert_bling_to_token: Converting {} BLING lamports to token {}",
            bling_lamports, target_token_mint
        );

        let program = self.opinions_market_program();
        let program_id = program.id();

        // If target is BLING, return as-is
        if target_token_mint == &self.bling_mint {
            return Ok(bling_lamports);
        }

        // Derive ValidPayment PDA for target token
        let (valid_payment_pda, _) = get_valid_payment_pda(&program_id, target_token_mint);

        // Fetch ValidPayment account
        let valid_payment: opinions_market::state::ValidPayment =
            program.account(valid_payment_pda).await.map_err(|e| {
                anyhow::anyhow!(
                    "Failed to fetch ValidPayment PDA {}: {}",
                    valid_payment_pda,
                    e
                )
            })?;

        // Check if payment is enabled
        if !valid_payment.enabled {
            return Err(anyhow::anyhow!(
                "Token {} is not enabled as a valid payment",
                target_token_mint
            ));
        }

        // Get token decimals (BLING has 9, USDC/Stablecoin have 6)
        // Fetch decimals dynamically from mint accounts
        let bling_decimals = self
            .get_token_decimals(&self.bling_mint)
            .await
            .unwrap_or(9u32); // Default to 9 if we can't fetch (BLING standard)
        let target_decimals = self
            .get_token_decimals(target_token_mint)
            .await
            .unwrap_or(6u32); // Default to 6 if we can't fetch (USDC/Stablecoin standard)

        // price_in_bling is the conversion rate: 1 token = price_in_bling BLING (in base units)
        // So to convert X BLING lamports to token lamports:
        // 1. Convert BLING lamports to base units: bling_base = bling_lamports / 10^bling_decimals
        // 2. Convert to token base units: token_base = bling_base / price_in_bling
        // 3. Convert to token lamports: token_lamports = token_base * 10^target_decimals
        // Combined: token_lamports = (bling_lamports * 10^target_decimals) / (price_in_bling * 10^bling_decimals)

        let price_in_bling = valid_payment.price_in_bling;

        // Use checked arithmetic to avoid overflow
        let numerator = bling_lamports
            .checked_mul(10u64.pow(target_decimals))
            .ok_or_else(|| anyhow::anyhow!("Overflow in conversion numerator"))?;

        let denominator = price_in_bling
            .checked_mul(10u64.pow(bling_decimals))
            .ok_or_else(|| anyhow::anyhow!("Overflow in conversion denominator"))?;

        let token_lamports = numerator
            .checked_div(denominator)
            .ok_or_else(|| anyhow::anyhow!("Division by zero in conversion"))?;

        println!(
            "  ✅ SolanaService::convert_bling_to_token: {} BLING lamports = {} token lamports (price_in_bling: {})",
            bling_lamports, token_lamports, price_in_bling
        );

        Ok(token_lamports)
    }

    /// Get token decimals by fetching the mint account
    async fn get_token_decimals(&self, token_mint: &Pubkey) -> anyhow::Result<u32> {
        use anchor_spl::token::spl_token::state::Mint;
        use solana_sdk::program_pack::Pack;

        let account_data = self
            .rpc
            .get_account_data(token_mint)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to fetch token mint account: {}", e))?;

        let mint = Mint::unpack(&account_data)
            .map_err(|e| anyhow::anyhow!("Failed to unpack mint account: {}", e))?;

        Ok(mint.decimals as u32)
    }

    /// Settle a post for a specific token mint (freezes math, no transfers)
    pub async fn settle_post_for_mint(
        &self,
        post_id_hash: [u8; 32],
        token_mint: &Pubkey,
    ) -> anyhow::Result<Signature> {
        println!(
            "  🔧 SolanaService::settle_post_for_mint: Starting for post_id_hash: {}, token_mint: {}",
            hex::encode(post_id_hash),
            token_mint
        );

        let program = self.opinions_market_program();
        let program_id = program.id();

        // Derive PDAs
        let (config_pda, _) = get_config_pda(&program_id);
        let (post_pda, _) = get_post_pda(&program_id, &post_id_hash);
        let (post_pot_token_account_pda, _) =
            get_post_pot_token_account_pda(&program_id, &post_pda, token_mint);
        let (post_pot_authority_pda, _) = get_post_pot_authority_pda(&program_id, &post_pda);
        let (post_mint_payout_pda, _) =
            get_post_mint_payout_pda(&program_id, &post_pda, token_mint);
        let (protocol_treasury_token_account_pda, _) =
            get_protocol_treasury_token_account_pda(&program_id, token_mint);

        // Fetch post account to check if it's a child post
        let post_account = program
            .account::<opinions_market::state::PostAccount>(post_pda)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to fetch post account: {}", e))?;

        // Handle parent post if this is a child post
        // NOTE: The Solana program has a bug in SettlePost instruction where parent_post_pot_token_account
        // and parent_post_pot_authority are derived using post.key() (current post) instead of parent_post.key().
        // This means we must always pass accounts derived from the CURRENT post, not the parent post,
        // to satisfy the seed constraint checks.
        let (parent_post_pda, parent_post_pot_token_account_pda, parent_post_pot_authority_pda) =
            match &post_account.relation {
                opinions_market::state::PostRelation::Reply { parent }
                | opinions_market::state::PostRelation::Quote { quoted: parent }
                | opinions_market::state::PostRelation::AnswerTo { question: parent } => {
                    // BUG WORKAROUND: Derive from current post (post_pda) not parent
                    // The program's seeds use post.key() so we must match that
                    let parent_pot_token_account =
                        get_post_pot_token_account_pda(&program_id, &post_pda, token_mint);
                    let parent_pot_authority = get_post_pot_authority_pda(&program_id, &post_pda);
                    (
                        Some(*parent),                    // Pass actual parent PDA for program logic
                        Some(parent_pot_token_account.0), // But derive token account from current post
                        parent_pot_authority.0,           // And derive authority from current post
                    )
                }
                opinions_market::state::PostRelation::Root => {
                    // For root posts, pass current post's accounts to satisfy constraint
                    // The program won't use them since it checks relation == Root first
                    (
                        None,
                        Some(post_pot_token_account_pda),
                        post_pot_authority_pda,
                    )
                }
            };

        println!("  🔨 SolanaService::settle_post_for_mint: Building SettlePost instruction...");

        let ixs = program
            .request()
            .accounts(opinions_market::accounts::SettlePost {
                payer: self.payer.pubkey(),
                post: post_pda,
                post_pot_token_account: post_pot_token_account_pda,
                post_pot_authority: post_pot_authority_pda,
                post_mint_payout: post_mint_payout_pda,
                protocol_token_treasury_token_account: protocol_treasury_token_account_pda,
                parent_post: parent_post_pda,
                parent_post_pot_token_account: parent_post_pot_token_account_pda,
                parent_post_pot_authority: parent_post_pot_authority_pda,
                config: config_pda,
                token_mint: *token_mint,
                token_program: spl_token::ID,
                system_program: solana_sdk::system_program::ID,
            })
            .args(opinions_market::instruction::SettlePost { post_id_hash })
            .instructions()
            .map_err(|e| {
                eprintln!(
                    "  ❌ SolanaService::settle_post_for_mint: Failed to build instruction: {}",
                    e
                );
                anyhow::anyhow!("Failed to build SettlePost instruction: {}", e)
            })?;

        println!("  ✅ SolanaService::settle_post_for_mint: Instruction built successfully");

        let tx = self.build_partial_signed_tx(ixs).await.map_err(|e| {
            eprintln!(
                "  ❌ SolanaService::settle_post_for_mint: Failed to build transaction: {}",
                e
            );
            e
        })?;

        println!("  📡 SolanaService::settle_post_for_mint: Sending transaction...");
        let signature = self.send_signed_tx(&tx).await.map_err(|e| {
            eprintln!(
                "  ❌ SolanaService::settle_post_for_mint: Failed to send transaction: {}",
                e
            );
            e
        })?;

        println!(
            "  ✅ SolanaService::settle_post_for_mint: Transaction confirmed! Signature: {}",
            signature
        );
        Ok(signature)
    }

    /// Distribute creator reward from frozen settlement
    pub async fn distribute_creator_reward(
        &self,
        post_id_hash: [u8; 32],
        token_mint: &Pubkey,
    ) -> anyhow::Result<Signature> {
        println!(
            "  🔧 SolanaService::distribute_creator_reward: Starting for post_id_hash: {}, token_mint: {}",
            hex::encode(post_id_hash),
            token_mint
        );

        let program = self.opinions_market_program();
        let program_id = program.id();

        // Derive PDAs
        let (post_pda, _) = get_post_pda(&program_id, &post_id_hash);
        let (post_pot_token_account_pda, _) =
            get_post_pot_token_account_pda(&program_id, &post_pda, token_mint);
        let (post_pot_authority_pda, _) = get_post_pot_authority_pda(&program_id, &post_pda);
        let (post_mint_payout_pda, _) =
            get_post_mint_payout_pda(&program_id, &post_pda, token_mint);

        // Fetch post account to get creator_user
        let post_account = program
            .account::<opinions_market::state::PostAccount>(post_pda)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to fetch post account: {}", e))?;

        let (creator_vault_token_account_pda, _) =
            get_user_vault_token_account_pda(&program_id, &post_account.creator_user, token_mint);
        let (vault_authority_pda, _) = get_vault_authority_pda(&program_id);

        let ixs = program
            .request()
            .accounts(opinions_market::accounts::DistributeCreatorReward {
                payer: self.payer.pubkey(),
                post: post_pda,
                post_pot_token_account: post_pot_token_account_pda,
                post_pot_authority: post_pot_authority_pda,
                post_mint_payout: post_mint_payout_pda,
                creator_vault_token_account: creator_vault_token_account_pda,
                vault_authority: vault_authority_pda,
                token_mint: *token_mint,
                token_program: spl_token::ID,
            })
            .args(opinions_market::instruction::DistributeCreatorReward { post_id_hash })
            .instructions()
            .map_err(|e| {
                anyhow::anyhow!("Failed to build DistributeCreatorReward instruction: {}", e)
            })?;

        let tx = self.build_partial_signed_tx(ixs).await?;
        let signature = self.send_signed_tx(&tx).await?;

        println!(
            "  ✅ SolanaService::distribute_creator_reward: Transaction confirmed! Signature: {}",
            signature
        );
        Ok(signature)
    }

    /// Distribute protocol fee from frozen settlement
    pub async fn distribute_protocol_fee(
        &self,
        post_id_hash: [u8; 32],
        token_mint: &Pubkey,
    ) -> anyhow::Result<Signature> {
        println!(
            "  🔧 SolanaService::distribute_protocol_fee: Starting for post_id_hash: {}, token_mint: {}",
            hex::encode(post_id_hash),
            token_mint
        );

        let program = self.opinions_market_program();
        let program_id = program.id();

        // Derive PDAs
        let (config_pda, _) = get_config_pda(&program_id);
        let (post_pda, _) = get_post_pda(&program_id, &post_id_hash);
        let (post_pot_token_account_pda, _) =
            get_post_pot_token_account_pda(&program_id, &post_pda, token_mint);
        let (post_pot_authority_pda, _) = get_post_pot_authority_pda(&program_id, &post_pda);
        let (post_mint_payout_pda, _) =
            get_post_mint_payout_pda(&program_id, &post_pda, token_mint);
        let (protocol_treasury_token_account_pda, _) =
            get_protocol_treasury_token_account_pda(&program_id, token_mint);

        let ixs = program
            .request()
            .accounts(opinions_market::accounts::DistributeProtocolFee {
                payer: self.payer.pubkey(),
                post: post_pda,
                post_pot_token_account: post_pot_token_account_pda,
                post_pot_authority: post_pot_authority_pda,
                post_mint_payout: post_mint_payout_pda,
                protocol_token_treasury_token_account: protocol_treasury_token_account_pda,
                config: config_pda,
                token_mint: *token_mint,
                token_program: spl_token::ID,
            })
            .args(opinions_market::instruction::DistributeProtocolFee { post_id_hash })
            .instructions()
            .map_err(|e| {
                anyhow::anyhow!("Failed to build DistributeProtocolFee instruction: {}", e)
            })?;

        let tx = self.build_partial_signed_tx(ixs).await?;
        let signature = self.send_signed_tx(&tx).await?;

        println!(
            "  ✅ SolanaService::distribute_protocol_fee: Transaction confirmed! Signature: {}",
            signature
        );
        Ok(signature)
    }

    /// Distribute parent post share from frozen settlement
    pub async fn distribute_parent_post_share(
        &self,
        post_id_hash: [u8; 32],
        token_mint: &Pubkey,
    ) -> anyhow::Result<Signature> {
        println!(
            "  🔧 SolanaService::distribute_parent_post_share: Starting for post_id_hash: {}, token_mint: {}",
            hex::encode(post_id_hash),
            token_mint
        );

        let program = self.opinions_market_program();
        let program_id = program.id();

        // Derive PDAs
        let (post_pda, _) = get_post_pda(&program_id, &post_id_hash);
        let (post_pot_token_account_pda, _) =
            get_post_pot_token_account_pda(&program_id, &post_pda, token_mint);
        let (post_pot_authority_pda, _) = get_post_pot_authority_pda(&program_id, &post_pda);
        let (post_mint_payout_pda, _) =
            get_post_mint_payout_pda(&program_id, &post_pda, token_mint);

        // Fetch post account to check if it's a child post
        let post_account = program
            .account::<opinions_market::state::PostAccount>(post_pda)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to fetch post account: {}", e))?;

        let (parent_post_pda, parent_post_pot_token_account_pda, parent_post_pot_authority_pda) =
            match &post_account.relation {
                opinions_market::state::PostRelation::Reply { parent }
                | opinions_market::state::PostRelation::Quote { quoted: parent }
                | opinions_market::state::PostRelation::AnswerTo { question: parent } => {
                    let parent_pot_token_account =
                        get_post_pot_token_account_pda(&program_id, parent, token_mint);
                    let parent_pot_authority = get_post_pot_authority_pda(&program_id, parent);
                    (
                        Some(*parent),
                        Some(parent_pot_token_account.0),
                        Some(parent_pot_authority.0),
                    )
                }
                opinions_market::state::PostRelation::Root => {
                    return Err(anyhow::anyhow!(
                        "Post is not a child post, cannot distribute to parent"
                    ));
                }
            };

        let ixs = program
            .request()
            .accounts(opinions_market::accounts::DistributeParentPostShare {
                payer: self.payer.pubkey(),
                post: post_pda,
                post_pot_token_account: post_pot_token_account_pda,
                post_pot_authority: post_pot_authority_pda,
                post_mint_payout: post_mint_payout_pda,
                parent_post: parent_post_pda,
                parent_post_pot_token_account: parent_post_pot_token_account_pda,
                parent_post_pot_authority: parent_post_pot_authority_pda,
                token_mint: *token_mint,
                token_program: spl_token::ID,
            })
            .args(opinions_market::instruction::DistributeParentPostShare { post_id_hash })
            .instructions()
            .map_err(|e| {
                anyhow::anyhow!(
                    "Failed to build DistributeParentPostShare instruction: {}",
                    e
                )
            })?;

        let tx = self.build_partial_signed_tx(ixs).await?;
        let signature = self.send_signed_tx(&tx).await?;

        println!(
            "  ✅ SolanaService::distribute_parent_post_share: Transaction confirmed! Signature: {}",
            signature
        );
        Ok(signature)
    }

    /// Build SettlePost instruction (returns instruction, doesn't send)
    pub async fn build_settle_post_instruction(
        &self,
        post_id_hash: [u8; 32],
        token_mint: &Pubkey,
    ) -> anyhow::Result<Vec<Instruction>> {
        let program = self.opinions_market_program();
        let program_id = program.id();

        // Derive PDAs
        let (config_pda, _) = get_config_pda(&program_id);
        let (post_pda, _) = get_post_pda(&program_id, &post_id_hash);
        let (post_pot_token_account_pda, _) =
            get_post_pot_token_account_pda(&program_id, &post_pda, token_mint);
        let (post_pot_authority_pda, _) = get_post_pot_authority_pda(&program_id, &post_pda);
        let (post_mint_payout_pda, _) =
            get_post_mint_payout_pda(&program_id, &post_pda, token_mint);
        let (protocol_treasury_token_account_pda, _) =
            get_protocol_treasury_token_account_pda(&program_id, token_mint);

        // Fetch post account to check if it's a child post
        let post_account = program
            .account::<opinions_market::state::PostAccount>(post_pda)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to fetch post account: {}", e))?;

        // Handle parent post if this is a child post
        // NOTE: The Solana program has a bug in SettlePost instruction where parent_post_pot_token_account
        // and parent_post_pot_authority are derived using post.key() (current post) instead of parent_post.key().
        // This means we must always pass accounts derived from the CURRENT post, not the parent post,
        // to satisfy the seed constraint checks.
        let (parent_post_pda, parent_post_pot_token_account_pda, parent_post_pot_authority_pda) =
            match &post_account.relation {
                opinions_market::state::PostRelation::Reply { parent }
                | opinions_market::state::PostRelation::Quote { quoted: parent }
                | opinions_market::state::PostRelation::AnswerTo { question: parent } => {
                    // BUG WORKAROUND: Derive from current post (post_pda) not parent
                    // The program's seeds use post.key() so we must match that
                    let parent_pot_token_account =
                        get_post_pot_token_account_pda(&program_id, &post_pda, token_mint);
                    let parent_pot_authority = get_post_pot_authority_pda(&program_id, &post_pda);
                    (
                        Some(*parent),                    // Pass actual parent PDA for program logic
                        Some(parent_pot_token_account.0), // But derive token account from current post
                        parent_pot_authority.0,           // And derive authority from current post
                    )
                }
                opinions_market::state::PostRelation::Root => {
                    // For root posts, pass current post's accounts to satisfy constraint
                    // The program won't use them since it checks relation == Root first
                    (
                        None,
                        Some(post_pot_token_account_pda),
                        post_pot_authority_pda,
                    )
                }
            };

        let ixs = program
            .request()
            .accounts(opinions_market::accounts::SettlePost {
                payer: self.payer.pubkey(),
                post: post_pda,
                post_pot_token_account: post_pot_token_account_pda,
                post_pot_authority: post_pot_authority_pda,
                post_mint_payout: post_mint_payout_pda,
                protocol_token_treasury_token_account: protocol_treasury_token_account_pda,
                parent_post: parent_post_pda,
                parent_post_pot_token_account: parent_post_pot_token_account_pda,
                parent_post_pot_authority: parent_post_pot_authority_pda,
                config: config_pda,
                token_mint: *token_mint,
                token_program: spl_token::ID,
                system_program: solana_sdk::system_program::ID,
            })
            .args(opinions_market::instruction::SettlePost { post_id_hash })
            .instructions()
            .map_err(|e| anyhow::anyhow!("Failed to build SettlePost instruction: {}", e))?;

        Ok(ixs)
    }

    /// Build DistributeCreatorReward instruction (returns instruction, doesn't send)
    pub async fn build_distribute_creator_reward_instruction(
        &self,
        post_id_hash: [u8; 32],
        token_mint: &Pubkey,
    ) -> anyhow::Result<Vec<Instruction>> {
        let program = self.opinions_market_program();
        let program_id = program.id();

        // Derive PDAs
        let (post_pda, _) = get_post_pda(&program_id, &post_id_hash);
        let (post_pot_token_account_pda, _) =
            get_post_pot_token_account_pda(&program_id, &post_pda, token_mint);
        let (post_pot_authority_pda, _) = get_post_pot_authority_pda(&program_id, &post_pda);
        let (post_mint_payout_pda, _) =
            get_post_mint_payout_pda(&program_id, &post_pda, token_mint);

        // Fetch post account to get creator_user
        let post_account = program
            .account::<opinions_market::state::PostAccount>(post_pda)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to fetch post account: {}", e))?;

        let (creator_vault_token_account_pda, _) =
            get_user_vault_token_account_pda(&program_id, &post_account.creator_user, token_mint);
        let (vault_authority_pda, _) = get_vault_authority_pda(&program_id);

        let ixs = program
            .request()
            .accounts(opinions_market::accounts::DistributeCreatorReward {
                payer: self.payer.pubkey(),
                post: post_pda,
                post_pot_token_account: post_pot_token_account_pda,
                post_pot_authority: post_pot_authority_pda,
                post_mint_payout: post_mint_payout_pda,
                creator_vault_token_account: creator_vault_token_account_pda,
                vault_authority: vault_authority_pda,
                token_mint: *token_mint,
                token_program: spl_token::ID,
            })
            .args(opinions_market::instruction::DistributeCreatorReward { post_id_hash })
            .instructions()
            .map_err(|e| {
                anyhow::anyhow!("Failed to build DistributeCreatorReward instruction: {}", e)
            })?;

        Ok(ixs)
    }

    /// Build DistributeProtocolFee instruction (returns instruction, doesn't send)
    pub async fn build_distribute_protocol_fee_instruction(
        &self,
        post_id_hash: [u8; 32],
        token_mint: &Pubkey,
    ) -> anyhow::Result<Vec<Instruction>> {
        let program = self.opinions_market_program();
        let program_id = program.id();

        // Derive PDAs
        let (config_pda, _) = get_config_pda(&program_id);
        let (post_pda, _) = get_post_pda(&program_id, &post_id_hash);
        let (post_pot_token_account_pda, _) =
            get_post_pot_token_account_pda(&program_id, &post_pda, token_mint);
        let (post_pot_authority_pda, _) = get_post_pot_authority_pda(&program_id, &post_pda);
        let (post_mint_payout_pda, _) =
            get_post_mint_payout_pda(&program_id, &post_pda, token_mint);
        let (protocol_treasury_token_account_pda, _) =
            get_protocol_treasury_token_account_pda(&program_id, token_mint);

        let ixs = program
            .request()
            .accounts(opinions_market::accounts::DistributeProtocolFee {
                payer: self.payer.pubkey(),
                post: post_pda,
                post_pot_token_account: post_pot_token_account_pda,
                post_pot_authority: post_pot_authority_pda,
                post_mint_payout: post_mint_payout_pda,
                protocol_token_treasury_token_account: protocol_treasury_token_account_pda,
                config: config_pda,
                token_mint: *token_mint,
                token_program: spl_token::ID,
            })
            .args(opinions_market::instruction::DistributeProtocolFee { post_id_hash })
            .instructions()
            .map_err(|e| {
                anyhow::anyhow!("Failed to build DistributeProtocolFee instruction: {}", e)
            })?;

        Ok(ixs)
    }

    /// Build DistributeParentPostShare instruction (returns instruction, doesn't send)
    pub async fn build_distribute_parent_post_share_instruction(
        &self,
        post_id_hash: [u8; 32],
        token_mint: &Pubkey,
    ) -> anyhow::Result<Option<Vec<Instruction>>> {
        let program = self.opinions_market_program();
        let program_id = program.id();

        // Derive PDAs
        let (post_pda, _) = get_post_pda(&program_id, &post_id_hash);
        let (post_pot_token_account_pda, _) =
            get_post_pot_token_account_pda(&program_id, &post_pda, token_mint);
        let (post_pot_authority_pda, _) = get_post_pot_authority_pda(&program_id, &post_pda);
        let (post_mint_payout_pda, _) =
            get_post_mint_payout_pda(&program_id, &post_pda, token_mint);

        // Fetch post account to check if it's a child post
        let post_account = program
            .account::<opinions_market::state::PostAccount>(post_pda)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to fetch post account: {}", e))?;

        let (parent_post_pda, parent_post_pot_token_account_pda, parent_post_pot_authority_pda) =
            match &post_account.relation {
                opinions_market::state::PostRelation::Reply { parent }
                | opinions_market::state::PostRelation::Quote { quoted: parent }
                | opinions_market::state::PostRelation::AnswerTo { question: parent } => {
                    let parent_pot_token_account =
                        get_post_pot_token_account_pda(&program_id, parent, token_mint);
                    let parent_pot_authority = get_post_pot_authority_pda(&program_id, parent);
                    (
                        Some(*parent),
                        Some(parent_pot_token_account.0),
                        Some(parent_pot_authority.0),
                    )
                }
                opinions_market::state::PostRelation::Root => {
                    // Not a child post, return None
                    return Ok(None);
                }
            };

        let ixs = program
            .request()
            .accounts(opinions_market::accounts::DistributeParentPostShare {
                payer: self.payer.pubkey(),
                post: post_pda,
                post_pot_token_account: post_pot_token_account_pda,
                post_pot_authority: post_pot_authority_pda,
                post_mint_payout: post_mint_payout_pda,
                parent_post: parent_post_pda,
                parent_post_pot_token_account: parent_post_pot_token_account_pda,
                parent_post_pot_authority: parent_post_pot_authority_pda,
                token_mint: *token_mint,
                token_program: spl_token::ID,
            })
            .args(opinions_market::instruction::DistributeParentPostShare { post_id_hash })
            .instructions()
            .map_err(|e| {
                anyhow::anyhow!(
                    "Failed to build DistributeParentPostShare instruction: {}",
                    e
                )
            })?;

        Ok(Some(ixs))
    }

    /// Get PostMintPayout account to check frozen status and fees
    pub async fn get_post_mint_payout(
        &self,
        post_id_hash: &[u8; 32],
        token_mint: &Pubkey,
    ) -> anyhow::Result<Option<opinions_market::state::PostMintPayout>> {
        let program = self.opinions_market_program();
        let program_id = program.id();
        let (post_pda, _) = get_post_pda(&program_id, post_id_hash);
        let (post_mint_payout_pda, _) =
            get_post_mint_payout_pda(&program_id, &post_pda, token_mint);

        match program
            .account::<opinions_market::state::PostMintPayout>(post_mint_payout_pda)
            .await
        {
            Ok(payout) => Ok(Some(payout)),
            Err(_) => Ok(None), // Payout doesn't exist yet (not settled)
        }
    }

    /// Check if user can claim and calculate claimable amount
    pub async fn get_claimable_reward(
        &self,
        user_wallet: &Pubkey,
        post_id_hash: &[u8; 32],
        token_mint: &Pubkey,
    ) -> anyhow::Result<Option<u64>> {
        let program = self.opinions_market_program();
        let program_id = program.id();
        let (post_pda, _) = get_post_pda(&program_id, post_id_hash);

        // Check if post is settled
        let post_account = match program
            .account::<opinions_market::state::PostAccount>(post_pda)
            .await
        {
            Ok(account) => account,
            Err(_) => return Ok(None), // Post doesn't exist
        };

        if post_account.state != opinions_market::state::PostState::Settled {
            return Ok(None); // Post not settled yet
        }

        // Check if payout is frozen
        let payout = match self.get_post_mint_payout(post_id_hash, token_mint).await? {
            Some(p) if p.frozen => p,
            _ => return Ok(None), // Not settled or not frozen
        };

        // Check if user has already claimed
        let (user_post_mint_claim_pda, _) =
            get_user_post_mint_claim_pda(&program_id, &post_pda, token_mint, user_wallet);
        if let Ok(claim_account) = program
            .account::<opinions_market::state::UserPostMintClaim>(user_post_mint_claim_pda)
            .await
        {
            // Check if already claimed
            if claim_account.claimed {
                return Ok(None); // Already claimed
            }
        }
        // If claim account doesn't exist, user hasn't claimed yet - continue

        // Get user's position
        let position = match self.get_user_position(user_wallet, post_id_hash).await? {
            Some(pos) => pos,
            None => return Ok(None), // User hasn't voted
        };

        // Get winning side
        let winning_side = match post_account.winning_side {
            Some(side) => side,
            None => return Ok(None), // No winner
        };

        // Calculate user's winning votes
        let user_votes = match winning_side {
            opinions_market::state::Side::Pump => position.upvotes as u64,
            opinions_market::state::Side::Smack => position.downvotes as u64,
        };

        if user_votes == 0 {
            return Ok(None); // User didn't vote for winning side
        }

        // Calculate claimable amount
        use opinions_market::constants::PRECISION;
        let scaled = user_votes
            .checked_mul(payout.payout_per_winning_vote)
            .ok_or(anyhow::anyhow!(
                "Math overflow calculating claimable reward"
            ))?;

        let reward = scaled
            .checked_div(PRECISION)
            .ok_or(anyhow::anyhow!("Math overflow dividing claimable reward"))?;

        if reward == 0 {
            return Ok(None); // Reward too small
        }

        Ok(Some(reward))
    }

    /// Claim post reward for a user (requires session authority)
    pub async fn claim_post_reward(
        &self,
        user_wallet: &Pubkey,
        post_id_hash: [u8; 32],
        token_mint: &Pubkey,
    ) -> anyhow::Result<Signature> {
        println!(
            "  🔧 SolanaService::claim_post_reward: Starting for user {}, post_id_hash: {}, token_mint: {}",
            user_wallet,
            hex::encode(post_id_hash),
            token_mint
        );

        let program = self.opinions_market_program();
        let program_id = program.id();

        // Derive PDAs
        let (config_pda, _) = get_config_pda(&program_id);
        let (post_pda, _) = get_post_pda(&program_id, &post_id_hash);
        let (position_pda, _) = get_position_pda(&program_id, &post_pda, user_wallet);
        let (user_post_mint_claim_pda, _) =
            get_user_post_mint_claim_pda(&program_id, &post_pda, token_mint, user_wallet);
        let (post_mint_payout_pda, _) =
            get_post_mint_payout_pda(&program_id, &post_pda, token_mint);
        let (post_pot_token_account_pda, _) =
            get_post_pot_token_account_pda(&program_id, &post_pda, token_mint);
        let (post_pot_authority_pda, _) = get_post_pot_authority_pda(&program_id, &post_pda);
        let (user_vault_token_account_pda, _) =
            get_user_vault_token_account_pda(&program_id, user_wallet, token_mint);
        let (session_authority_pda, _) =
            get_session_authority_pda(&program_id, user_wallet, &self.session_key.pubkey());

        println!("  🔨 SolanaService::claim_post_reward: Building ClaimPostReward instruction...");

        let ixs = program
            .request()
            .accounts(opinions_market::accounts::ClaimPostReward {
                config: config_pda,
                user: *user_wallet,
                payer: self.payer.pubkey(),
                session_key: self.session_key.pubkey(),
                session_authority: session_authority_pda,
                post: post_pda,
                position: position_pda,
                user_post_mint_claim: user_post_mint_claim_pda,
                post_mint_payout: post_mint_payout_pda,
                post_pot_token_account: post_pot_token_account_pda,
                post_pot_authority: post_pot_authority_pda,
                user_vault_token_account: user_vault_token_account_pda,
                token_mint: *token_mint,
                token_program: spl_token::ID,
                system_program: solana_sdk::system_program::ID,
            })
            .args(opinions_market::instruction::ClaimPostReward { post_id_hash })
            .instructions()
            .map_err(|e| {
                eprintln!(
                    "  ❌ SolanaService::claim_post_reward: Failed to build instruction: {}",
                    e
                );
                anyhow::anyhow!("Failed to build ClaimPostReward instruction: {}", e)
            })?;

        println!("  ✅ SolanaService::claim_post_reward: Instruction built successfully");

        let tx = self.build_partial_signed_tx(ixs).await.map_err(|e| {
            eprintln!(
                "  ❌ SolanaService::claim_post_reward: Failed to build transaction: {}",
                e
            );
            e
        })?;

        println!("  📡 SolanaService::claim_post_reward: Sending transaction...");
        let signature = self.send_signed_tx(&tx).await.map_err(|e| {
            eprintln!(
                "  ❌ SolanaService::claim_post_reward: Failed to send transaction: {}",
                e
            );
            e
        })?;

        println!(
            "  ✅ SolanaService::claim_post_reward: Transaction confirmed! Signature: {}",
            signature
        );
        Ok(signature)
    }
}
