use anchor_client::{solana_sdk::commitment_config::CommitmentConfig, Client, Cluster};

use solana_sdk::{
    native_token::LAMPORTS_PER_SOL,
    signature::{read_keypair_file, Keypair, Signer},
}; // Add this import

use crate::utils::utils::{
    setup_token_mint, setup_token_mint_ata_and_mint_to, setup_token_mint_ata_and_mint_to_many_users,
};

// #[test]
// fn test_initialize() {
//     let program_id = "8zZcmGeJ6KXSnSyewB7vfLUrYVLfibh6UP3qPujQoeaa";
//     let anchor_wallet = std::env::var("ANCHOR_WALLET").unwrap();
//     let payer = read_keypair_file(&anchor_wallet).unwrap();

//     let client = Client::new_with_options(Cluster::Localnet, &payer, CommitmentConfig::confirmed());
//     let program_id = Pubkey::from_str(program_id).unwrap();
//     let program = client.program(program_id).unwrap();

//     let tx = program
//         .request()
//         .accounts(opinions_market_engine::accounts::Initialize {})
//         .args(opinions_market_engine::instruction::Initialize {})
//         .send()
//         .expect("");

//     println!("Your transaction signature {}", tx);
// }
use std::collections::HashMap;

#[tokio::test]
async fn test_setup() {
    let program_id = opinions_market_engine::ID;
    let anchor_wallet = std::env::var("ANCHOR_WALLET").unwrap();
    let payer = read_keypair_file(&anchor_wallet).unwrap();
    let payer_pubkey = &payer.pubkey();

    let client = Client::new_with_options(Cluster::Localnet, &payer, CommitmentConfig::confirmed());

    let program = client.program(program_id).unwrap();
    let rpc = program.rpc();

    let bling_mint = Keypair::new();
    let bling_pubkey = bling_mint.pubkey();

    let usdc_mint = Keypair::new();
    let usdc_pubkey = usdc_mint.pubkey();

    let stablecoin_mint = Keypair::new();
    let stablecoin_pubkey = stablecoin_mint.pubkey();

    setup_token_mint(&rpc, &payer, &payer, &program, &bling_mint).await;
    setup_token_mint(&rpc, &payer, &payer, &program, &usdc_mint).await;
    setup_token_mint(&rpc, &payer, &payer, &program, &stablecoin_mint).await;

    println!("\n\n");
    println!(" 🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪");
    println!("🟪 GOD LOVES ME 🟪");
    println!(" 🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪");
    panic!();
}
