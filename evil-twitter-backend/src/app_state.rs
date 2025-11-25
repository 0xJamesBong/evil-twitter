use std::sync::Arc;

use mongodb::{Client, Database};

use crate::services::{PrivyService, mongo_service::MongoService, SolanaService};
use crate::solana::{SolanaConnection, SolanaProgram, program::parse_keypair_from_base58, program::parse_pubkey};

/// Application state shared across all handlers
///
/// This struct holds all the services and dependencies needed by the application.
/// Using Arc allows thread-safe sharing across async tasks.
///
/// Services encapsulate all database operations - no direct database access.
#[derive(Clone)]
pub struct AppState {
    /// Services - all database operations go through services
    pub mongo_service: Arc<MongoService>,
    /// Privy service for authentication
    pub privy_service: Arc<PrivyService>,
    /// Solana service for on-chain operations
    pub solana_service: Arc<SolanaService>,
    // pub cache: Arc<RedisClient>,
    // pub email: Arc<EmailService>,
    // pub s3: Arc<S3Service>,
}

impl AppState {
    pub fn new(client: Client, db: Database) -> Self {
        let app_id =
            std::env::var("PRIVY_APP_ID").expect("PRIVY_APP_ID environment variable must be set");
        let app_secret = std::env::var("PRIVY_APP_SECRET")
            .expect("PRIVY_APP_SECRET environment variable must be set");

        // Validate that values are not empty
        if app_id.is_empty() {
            panic!("PRIVY_APP_ID is set but empty");
        }
        if app_secret.is_empty() {
            panic!("PRIVY_APP_SECRET is set but empty");
        }

        // Log that Privy is configured (without exposing secrets)
        println!(
            "✅ Privy configured with App ID: {}...{}",
            &app_id[..app_id.len().min(8)],
            &app_id[app_id.len().saturating_sub(4)..]
        );

        // Initialize Solana service
        let solana_rpc_url = std::env::var("SOLANA_RPC_URL")
            .unwrap_or_else(|_| "http://localhost:8899".to_string());
        let solana_network = std::env::var("SOLANA_NETWORK")
            .unwrap_or_else(|_| "localnet".to_string());
        let solana_program_id_str = std::env::var("SOLANA_PROGRAM_ID")
            .unwrap_or_else(|_| "4z5rjroGdWmgGX13SdFsh4wRM4jJkMUrcvYrNpV3gezm".to_string());
        let solana_program_id = parse_pubkey(&solana_program_id_str)
            .expect("Invalid SOLANA_PROGRAM_ID");
        
        let bling_mint_str = std::env::var("BLING_MINT")
            .expect("BLING_MINT environment variable must be set");
        let bling_mint = parse_pubkey(&bling_mint_str)
            .expect("Invalid BLING_MINT");

        // Get payer keypair (backend signer)
        let payer_keypair_str = std::env::var("SOLANA_PAYER_KEYPAIR")
            .expect("SOLANA_PAYER_KEYPAIR environment variable must be set");
        let payer_keypair = parse_keypair_from_base58(&payer_keypair_str)
            .expect("Invalid SOLANA_PAYER_KEYPAIR");

        let solana_connection = Arc::new(SolanaConnection::new(solana_rpc_url, solana_network));
        let solana_program = Arc::new(
            SolanaProgram::new(solana_program_id, payer_keypair, solana_connection.clone())
                .expect("Failed to create Solana program")
        );
        let solana_service = Arc::new(SolanaService::new(solana_program, solana_program_id, bling_mint));

        Self {
            mongo_service: Arc::new(MongoService::new(client.clone(), db.clone())),
            privy_service: Arc::new(PrivyService::new(app_id, app_secret)),
            solana_service,
        }
    }
}
