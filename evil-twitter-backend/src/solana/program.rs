use crate::solana::connection::SolanaConnection;
use crate::solana::errors::SolanaError;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{pubkey::Pubkey, signature::Keypair};
use std::sync::Arc;

pub struct SolanaProgram {
    program_id: Pubkey,
    payer: Arc<Keypair>,
    connection: Arc<SolanaConnection>,
}

impl SolanaProgram {
    pub fn new(
        program_id: Pubkey,
        payer_keypair: Keypair,
        connection: Arc<SolanaConnection>,
    ) -> Result<Self, SolanaError> {
        Ok(Self {
            program_id,
            payer: Arc::new(payer_keypair),
            connection,
        })
    }

    pub fn get_program_id(&self) -> &Pubkey {
        &self.program_id
    }

    pub fn get_payer(&self) -> &Arc<Keypair> {
        &self.payer
    }

    pub fn get_connection(&self) -> RpcClient {
        self.connection.get_connection()
    }

    pub fn get_connection_service(&self) -> &Arc<SolanaConnection> {
        &self.connection
    }
}

/// Helper function to parse a base58-encoded keypair from string
pub fn parse_keypair_from_base58(base58_str: &str) -> Result<Keypair, SolanaError> {
    let bytes = bs58::decode(base58_str)
        .into_vec()
        .map_err(|e| SolanaError::KeypairError(format!("Failed to decode base58: {}", e)))?;

    Keypair::from_bytes(&bytes)
        .map_err(|e| SolanaError::KeypairError(format!("Failed to create keypair: {}", e)))
}

/// Helper function to parse a Pubkey from string
pub fn parse_pubkey(pubkey_str: &str) -> Result<Pubkey, SolanaError> {
    Pubkey::from_str(pubkey_str)
        .map_err(|e| SolanaError::RpcError(format!("Invalid pubkey: {}", e)))
}

use std::str::FromStr;
