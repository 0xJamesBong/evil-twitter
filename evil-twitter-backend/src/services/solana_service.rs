use std::collections::HashMap;
use std::fs;

use anchor_client::anchor_lang::solana_program::example_mocks::solana_sdk::system_instruction;
use anchor_client::anchor_lang::solana_program::example_mocks::solana_sdk::system_program;
use anchor_spl::associated_token::spl_associated_token_account::instruction::create_associated_token_account;
use anchor_spl::{
    associated_token::spl_associated_token_account::{self},
    token::spl_token,
};
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::{
    instruction::Instruction,
    message::{VersionedMessage, v0::Message},
    native_token::LAMPORTS_PER_SOL,
    program_pack::Pack,
    signature::{Keypair, Signature},
    signers::Signers,
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
use solana_sdk::commitment_config::CommitmentConfig;
use std::sync::Arc;

use opinions_market::accounts::*;
use opinions_market::instructions::*;

use crate::solana::get_config_pda;
use crate::solana::{get_user_account_pda, get_user_vault_token_account_pda};

pub struct SolanaService {
    rpc: Arc<RpcClient>,
    payer: Arc<Keypair>,
    program_id: Pubkey,
    bling_mint: Pubkey,
}

fn read_program_id_from_idl() -> Pubkey {
    let file =
        fs::read_to_string("src/solana/idl/opinions_market.json").expect("IDL file not found");
    let v: Value = serde_json::from_str(&file).expect("Invalid JSON in IDL");

    let addr = v["address"].as_str().expect("IDL missing address field");

    addr.parse().expect("Invalid program ID format")
}

impl SolanaService {
    pub fn new(rpc: Arc<RpcClient>, payer: Arc<Keypair>, bling_mint: Pubkey) -> Self {
        let program_id = read_program_id_from_idl();

        Self {
            rpc,
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
        let client = Client::new_with_options(
            Cluster::Localnet,
            self.payer.clone(),
            CommitmentConfig::confirmed(),
        );
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

    /// Create a user account on-chain, signed by backend payer only
    pub async fn create_user(&self, user_wallet: Pubkey) -> anyhow::Result<Signature> {
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
}
