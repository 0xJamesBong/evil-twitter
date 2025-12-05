use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::sync::{Arc, Mutex};

use mongodb::{Client, Database};
use opinions_market::state::Side;
use solana_sdk::pubkey::Pubkey;

use crate::services::{
    PrivyService,
    SolanaService,
    mongo_service::MongoService,
    // post_sync_service::PostSyncService,
};
use crate::solana::parse_keypair_from_base58;
use crate::solana::{
    SolanaConnection, SolanaProgram,
    program::{parse_pubkey, read_keypair_from_file},
};
use solana_sdk::signer::Signer;

/// Key for vote buffer: uniquely identifies a pending vote batch
#[derive(Clone, PartialEq, Eq)]
pub struct VoteBufferKey {
    pub user: Pubkey,
    pub post_id_hash: [u8; 32],
    pub side: Side,
    pub token_mint: Pubkey,
}

impl Hash for VoteBufferKey {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.user.hash(state);
        self.post_id_hash.hash(state);
        // Hash Side as u8 (Pump = 0, Smack = 1)
        match self.side {
            Side::Pump => 0u8.hash(state),
            Side::Smack => 1u8.hash(state),
        }
        self.token_mint.hash(state);
    }
}

/// Value for vote buffer: accumulated votes and metadata
pub struct VoteBufferValue {
    pub accumulated_votes: u64,
    pub last_click_ts: i64,
}

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
    /// Vote buffer: accumulates clicks before batching into Solana transactions
    pub vote_buffer: Arc<Mutex<HashMap<VoteBufferKey, VoteBufferValue>>>,
    // Post sync service for syncing on-chain post state to MongoDB
    // pub post_sync_service: Arc<PostSyncService>,
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
        let solana_rpc_url =
            std::env::var("SOLANA_RPC_URL").unwrap_or_else(|_| "http://localhost:8899".to_string());
        let solana_network =
            std::env::var("SOLANA_NETWORK").unwrap_or_else(|_| "localnet".to_string());
        let solana_program_id_str = std::env::var("SOLANA_PROGRAM_ID")
            .unwrap_or_else(|_| "4z5rjroGdWmgGX13SdFsh4wRM4jJkMUrcvYrNpV3gezm".to_string());
        let solana_program_id =
            parse_pubkey(&solana_program_id_str).expect("Invalid SOLANA_PROGRAM_ID");

        let bling_mint_str =
            std::env::var("BLING_MINT").expect("BLING_MINT environment variable must be set");
        let bling_mint = parse_pubkey(&bling_mint_str).expect("Invalid BLING_MINT");

        // Get payer keypair (backend signer) - support both base64 env var and file path
        // let payer_keypair = if let Ok(base64_keypair) = std::env::var("SOLANA_PAYER_KEYPAIR_BASE58") {
        //     // Load from base64 environment variable (for Railway deployment)
        //     println!("📦 Loading keypair from SOLANA_PAYER_KEYPAIR_BASE58 env var");
        //     read_keypair_from_base64(&base64_keypair)
        //         .expect("Failed to decode keypair from SOLANA_PAYER_KEYPAIR_BASE58")
        // } else {
        //     // Fallback to file path (for local development)
        //     let payer_keypair_path = std::env::var("SOLANA_PAYER_KEYPAIR_PATH")
        //         .expect("SOLANA_PAYER_KEYPAIR_PATH environment variable must be set (or use SOLANA_PAYER_KEYPAIR_BASE58)");
        //     println!("📁 Loading keypair from file: {}", payer_keypair_path);
        //     read_keypair_from_file(&payer_keypair_path)
        //         .expect(&format!("Failed to read keypair from {}. Make sure the file exists and the backend is run from the evil-twitter-backend directory.", payer_keypair_path))
        // };
        let payer_keypair = if let Ok(base64_keypair) = std::env::var("SOLANA_PAYER_KEYPAIR_BASE58")
        {
            println!("📦 Loading keypair from SOLANA_PAYER_KEYPAIR_BASE58 env var");
            match parse_keypair_from_base58(&base64_keypair) {
                Ok(kp) => kp,
                Err(_) => {
                    println!(
                        "⚠ Failed to decode base64 keypair, falling back to SOLANA_PAYER_KEYPAIR_PATH"
                    );
                    println!("base64_keypair: {}", base64_keypair);
                    let path = std::env::var("SOLANA_PAYER_KEYPAIR_PATH")
                        .expect("SOLANA_PAYER_KEYPAIR_PATH must exist if base64 decoding fails");
                    read_keypair_from_file(&path).expect("Failed to load fallback keypair file")
                }
            }
        } else {
            let path = std::env::var("SOLANA_PAYER_KEYPAIR_PATH")
                .expect("SOLANA_PAYER_KEYPAIR_PATH env variable must be set");
            println!("📁 Loading keypair from file: {}", path);

            read_keypair_from_file(&path).expect("Failed to read keypair from supplied file")
        };

        println!(
            "✅ Solana payer keypair loaded (pubkey: {})",
            payer_keypair.pubkey()
        );

        let solana_connection = Arc::new(SolanaConnection::new(
            solana_rpc_url.clone(),
            solana_network,
        ));
        let solana_program = Arc::new(
            SolanaProgram::new(solana_program_id, payer_keypair, solana_connection.clone())
                .expect("Failed to create Solana program"),
        );

        // Create RPC client for SolanaService
        let rpc_client = Arc::new(solana_client::nonblocking::rpc_client::RpcClient::new(
            solana_rpc_url,
        ));
        // For now, session_key is the same as payer (in production they'll be different)
        // Clone the inner Keypair from Arc<Keypair> by serializing and deserializing
        let payer_keypair_ref = solana_program.get_payer();
        let session_key =
            solana_sdk::signature::Keypair::try_from(&payer_keypair_ref.to_bytes()[..])
                .expect("Failed to clone keypair for session_key");
        let solana_service = Arc::new(SolanaService::new(
            rpc_client,
            session_key,
            solana_program.get_payer().clone(),
            bling_mint,
        ));

        // let post_sync_service = Arc::new(PostSyncService::new(db.clone(), solana_service.clone()));

        Self {
            mongo_service: Arc::new(MongoService::new(client.clone(), db.clone())),
            privy_service: Arc::new(PrivyService::new(app_id, app_secret)),
            solana_service,
            vote_buffer: Arc::new(Mutex::new(HashMap::new())),
            // post_sync_service,
        }
    }
}
