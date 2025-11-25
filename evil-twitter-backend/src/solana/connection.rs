use crate::solana::errors::SolanaError;
use solana_client::rpc_client::RpcClient;
use solana_sdk::hash::Hash;

pub struct SolanaConnection {
    rpc_url: String,
    network: String,
}

impl SolanaConnection {
    pub fn new(rpc_url: String, network: String) -> Self {
        Self { rpc_url, network }
    }

    pub fn get_connection(&self) -> RpcClient {
        RpcClient::new(self.rpc_url.clone())
    }

    pub fn get_latest_blockhash(&self) -> Result<Hash, SolanaError> {
        let client = self.get_connection();
        client
            .get_latest_blockhash()
            .map_err(|e| SolanaError::RpcError(format!("Failed to get latest blockhash: {}", e)))
    }

    pub fn get_rpc_url(&self) -> &str {
        &self.rpc_url
    }

    pub fn get_network(&self) -> &str {
        &self.network
    }
}
