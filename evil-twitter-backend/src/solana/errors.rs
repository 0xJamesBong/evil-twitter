use thiserror::Error;

#[derive(Error, Debug)]
pub enum SolanaError {
    #[error("Solana RPC error: {0}")]
    RpcError(String),

    #[error("Transaction failed: {0}")]
    TransactionError(String),

    #[error("Account not found: {0}")]
    AccountNotFound(String),

    #[error("Invalid account data: {0}")]
    InvalidAccountData(String),

    #[error("PDA derivation failed")]
    PdaDerivationFailed,

    #[error("Insufficient funds")]
    InsufficientFunds,

    #[error("Post not open")]
    PostNotOpen,

    #[error("Post expired")]
    PostExpired,

    #[error("Post already settled")]
    PostAlreadySettled,

    #[error("Invalid side: must be 'pump' or 'smack'")]
    InvalidSide,

    #[error("Zero votes not allowed")]
    ZeroVotes,

    #[error("Mint not enabled")]
    MintNotEnabled,

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Deserialization error: {0}")]
    DeserializationError(String),

    #[error("Keypair error: {0}")]
    KeypairError(String),
}

impl From<solana_client::client_error::ClientError> for SolanaError {
    fn from(err: solana_client::client_error::ClientError) -> Self {
        SolanaError::RpcError(err.to_string())
    }
}

impl From<solana_sdk::transaction::TransactionError> for SolanaError {
    fn from(err: solana_sdk::transaction::TransactionError) -> Self {
        SolanaError::TransactionError(err.to_string())
    }
}

impl From<bs58::decode::Error> for SolanaError {
    fn from(err: bs58::decode::Error) -> Self {
        SolanaError::KeypairError(format!("Base58 decode error: {}", err))
    }
}
