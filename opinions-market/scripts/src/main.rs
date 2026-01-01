use anchor_client::{
    anchor_lang::prelude::*,
    solana_sdk::{
        commitment_config::CommitmentConfig,
        signature::{read_keypair_file, Keypair},
        signer::Signer,
    },
    Client, Cluster,
};

use anchor_spl::associated_token::get_associated_token_address;
use solana_sdk::native_token::LAMPORTS_PER_SOL;
use std::collections::HashMap;

use fed::ID as FED_ID;
use opinions_market::constants::USDC_LAMPORTS_PER_USDC;
use opinions_market::pda_seeds::*;
use opinions_market::ID;

use tests::utils::phenomena::test_phenomena_turn_on_withdrawable;
use tests::utils::utils::{
    airdrop_sol_to_users, send_tx, setup_token_mint, setup_token_mint_ata_and_mint_to_many_users,
};

#[tokio::main]
async fn main() {
    let anchor_wallet = std::env::var("ANCHOR_WALLET").unwrap();
    let payer = read_keypair_file(&anchor_wallet).unwrap();

    let program_id = ID;

    // Determine cluster
    let cluster = std::env::var("CLUSTER").unwrap_or("localnet".to_string());
    println!("🌍 Bootstrap running on cluster: {}", cluster);

    let cluster_enum = match cluster.as_str() {
        "devnet" => Cluster::Devnet,
        "mainnet" => Cluster::Mainnet,
        _ => Cluster::Localnet,
    };

    let client = Client::new_with_options(cluster_enum, &payer, CommitmentConfig::processed());
    let opinions_market = client.program(program_id).unwrap();
    let fed_program_id = FED_ID;
    let fed = client.program(fed_program_id).unwrap();
    let rpc = opinions_market.rpc();

    // --- USERS ---
    let admin = Keypair::new();
    let admin_pubkey = admin.pubkey();

    // Read the backend payer keypair from secrets
    let chauhai_wallet_path = std::env::var("CHAUHAI_WALLET_PATH").unwrap();
    println!(
        "CHAUHAI_WALLET_PATH: {}",
        std::env::var("CHAUHAI_WALLET_PATH").unwrap()
    );

    let chauhai = read_keypair_file(&chauhai_wallet_path).unwrap();
    let chauhai_pubkey = chauhai.pubkey();

    let everyone = HashMap::from([
        (payer.pubkey(), "payer".to_string()),
        (admin.pubkey(), "admin".to_string()),
        (chauhai_pubkey, "backend_payer".to_string()),
    ]);

    // --- TOKEN MINT KEYS ---
    // bbb9w3ZidNJJGm4TKbhkCXqB9XSnzsjTedmJ5F2THX8
    let bling_mint = read_keypair_file("token-keys/bling-mint.json").unwrap();
    // uuuQZDeaQBsUfoznkdG9sC3NE84qwMgVNEWy3cNTLpZ
    let usdc_mint = read_keypair_file("token-keys/usdc-mint.json").unwrap();
    // ssswz51ULztPNpiranCt4GWCawXos8RGiGZveeinLhm
    let stablecoin_mint = read_keypair_file("token-keys/stablecoin-mint.json").unwrap();

    // --- AIRDROP ---
    if cluster != "devnet" {
        airdrop_sol_to_users(&rpc, &everyone).await;
    } else {
        println!("⏭  Skipping airdrop on devnet");
    }

    // --- CREATE MINTS ---
    // // If mint already exists, skip creation
    if rpc.get_account(&bling_mint.pubkey()).await.is_err() {
        setup_token_mint(&rpc, &payer, &payer, &opinions_market, &bling_mint, 9).await;
    }
    if rpc.get_account(&usdc_mint.pubkey()).await.is_err() {
        setup_token_mint(&rpc, &payer, &payer, &opinions_market, &usdc_mint, 6).await;
    }
    if rpc.get_account(&stablecoin_mint.pubkey()).await.is_err() {
        setup_token_mint(&rpc, &payer, &payer, &opinions_market, &stablecoin_mint, 6).await;
    }
    // --- CONFIG PDAs ---
    let fed_config_pda =
        Pubkey::find_program_address(&[fed::pda_seeds::FED_CONFIG_SEED], &fed_program_id).0;
    let om_config_pda = Pubkey::find_program_address(&[OM_CONFIG_SEED], &program_id).0;
    let protocol_bling_treasury = Pubkey::find_program_address(
        &[
            fed::pda_seeds::PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED,
            bling_mint.pubkey().as_ref(),
        ],
        &fed_program_id,
    )
    .0;
    let valid_payment_pda = Pubkey::find_program_address(
        &[
            fed::pda_seeds::VALID_PAYMENT_SEED,
            bling_mint.pubkey().as_ref(),
        ],
        &fed_program_id,
    )
    .0;

    let base_duration_secs = 60 * 5; // 5 minutes
    let max_duration_secs = 24 * 3600; // 1 day
    let extension_per_vote_secs = 10; // 10 seconds

    // --- INITIALIZE FED PROGRAM FIRST ---
    println!("🌍 Initializing FED program...");
    let initialize_fed_ix = fed
        .request()
        .accounts(fed::accounts::Initialize {
            admin: admin_pubkey,
            payer: payer.pubkey(),
            fed_config: fed_config_pda,
            bling_mint: bling_mint.pubkey(),
            usdc_mint: usdc_mint.pubkey(),
            protocol_bling_treasury,
            valid_payment: valid_payment_pda,
            system_program: anchor_lang::solana_program::system_program::ID,
            token_program: anchor_spl::token::spl_token::ID,
        })
        .args(fed::instruction::Initialize {})
        .instructions()
        .unwrap();

    if let Err(e) = send_tx(&rpc, initialize_fed_ix, &payer.pubkey(), &[&payer, &admin]).await {
        eprintln!("❌ Error initializing FED program: {}", e);
        std::process::exit(1);
    }
    println!("✅ FED program initialized");

    // --- INITIALIZE OPINIONS_MARKET PROGRAM ---
    println!("🌍 Initializing Opinions Market program...");
    let initialize_ix = opinions_market
        .request()
        .accounts(opinions_market::accounts::Initialize {
            admin: admin_pubkey,
            payer: payer.pubkey(),
            om_config: om_config_pda,
            system_program: anchor_lang::solana_program::system_program::ID,
        })
        .args(opinions_market::instruction::Initialize {
            base_duration_secs,
            max_duration_secs,
            extension_per_vote_secs,
        })
        .instructions()
        .unwrap();

    if let Err(e) = send_tx(&rpc, initialize_ix, &payer.pubkey(), &[&payer, &admin]).await {
        eprintln!("❌ Error initializing Opinions Market program: {}", e);
        std::process::exit(1);
    }
    println!("✅ Opinions Market program initialized");

    // MINT BLING TO EVERYONE
    setup_token_mint_ata_and_mint_to_many_users(
        &rpc,
        &payer,
        &payer,
        &everyone.keys().cloned().collect::<Vec<Pubkey>>(),
        &opinions_market,
        &bling_mint,
        1_000_000_000 * LAMPORTS_PER_SOL,
        &bling_mint,
        &usdc_mint,
        &stablecoin_mint,
    )
    .await;
    // MINT USDC TO EVERYONE (6 decimals: 1_000_000_000 tokens = 1_000_000_000 * USDC_LAMPORTS_PER_USDC lamports)
    setup_token_mint_ata_and_mint_to_many_users(
        &rpc,
        &payer,
        &payer,
        &everyone.keys().cloned().collect::<Vec<Pubkey>>(),
        &opinions_market,
        &usdc_mint,
        1_000 * USDC_LAMPORTS_PER_USDC, // 1 thousand USDC with 6 decimals
        &bling_mint,
        &usdc_mint,
        &stablecoin_mint,
    )
    .await;

    // MINT STABLECOIN TO EVERYONE (6 decimals: 1_000_000_000 tokens = 1_000_000_000 * USDC_LAMPORTS_PER_USDC lamports)
    setup_token_mint_ata_and_mint_to_many_users(
        &rpc,
        &payer,
        &payer,
        &everyone.keys().cloned().collect::<Vec<Pubkey>>(),
        &opinions_market,
        &stablecoin_mint,
        7_000 * USDC_LAMPORTS_PER_USDC, // 7 thousand Stablecoin with 6 decimals
        &bling_mint,
        &usdc_mint,
        &stablecoin_mint,
    )
    .await;

    // register USDC and STABLECOIN TO VALID PAYMENTS
    // Register USDC
    println!("🌍 Registering USDC as valid payment...");
    let usdc_valid_payment_pda = Pubkey::find_program_address(
        &[
            fed::pda_seeds::VALID_PAYMENT_SEED,
            usdc_mint.pubkey().as_ref(),
        ],
        &fed_program_id,
    )
    .0;
    let usdc_treasury_pda = Pubkey::find_program_address(
        &[
            fed::pda_seeds::PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED,
            usdc_mint.pubkey().as_ref(),
        ],
        &fed_program_id,
    )
    .0;
    let usdc_valid_payment_ix = fed
        .request()
        .accounts(fed::accounts::RegisterValidPayment {
            fed_config: fed_config_pda,
            admin: admin_pubkey,
            token_mint: usdc_mint.pubkey(),
            valid_payment: usdc_valid_payment_pda,
            protocol_token_treasury_token_account: usdc_treasury_pda,
            system_program: anchor_lang::solana_program::system_program::ID,
            token_program: anchor_spl::token::spl_token::ID,
        })
        .args(fed::instruction::RegisterValidPayment {
            price_in_bling: 10, // 1 USDC = 10 BLING
            withdrawable: true, // USDC is withdrawable
        })
        .instructions()
        .unwrap();
    let usdc_valid_payment_tx = send_tx(
        &rpc,
        usdc_valid_payment_ix,
        &payer.pubkey(),
        &[&payer, &admin],
    )
    .await
    .unwrap();
    println!(
        "USDC registered to valid payments: {:?}",
        usdc_valid_payment_tx
    );

    // Register STABLECOIN
    println!("🌍 Registering STABLECOIN as valid payment...");
    let stablecoin_valid_payment_pda = Pubkey::find_program_address(
        &[
            fed::pda_seeds::VALID_PAYMENT_SEED,
            stablecoin_mint.pubkey().as_ref(),
        ],
        &fed_program_id,
    )
    .0;
    let stablecoin_treasury_pda = Pubkey::find_program_address(
        &[
            fed::pda_seeds::PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED,
            stablecoin_mint.pubkey().as_ref(),
        ],
        &fed_program_id,
    )
    .0;
    let stablecoin_valid_payment_ix = fed
        .request()
        .accounts(fed::accounts::RegisterValidPayment {
            fed_config: fed_config_pda,
            admin: admin_pubkey,
            token_mint: stablecoin_mint.pubkey(),
            valid_payment: stablecoin_valid_payment_pda,
            protocol_token_treasury_token_account: stablecoin_treasury_pda,
            system_program: anchor_lang::solana_program::system_program::ID,
            token_program: anchor_spl::token::spl_token::ID,
        })
        .args(fed::instruction::RegisterValidPayment {
            price_in_bling: 1000, // 1 STABLECOIN = 1000 BLING
            withdrawable: true,   // STABLECOIN is withdrawable
        })
        .instructions()
        .unwrap();
    let stablecoin_valid_payment_tx = send_tx(
        &rpc,
        stablecoin_valid_payment_ix,
        &payer.pubkey(),
        &[&payer, &admin],
    )
    .await
    .unwrap();
    println!(
        "STABLECOIN registered to valid payments: {:?}",
        stablecoin_valid_payment_tx
    );

    println!("BLING_MINT: {}", bling_mint.pubkey());
    println!("USDC_MINT: {}", usdc_mint.pubkey());
    println!("STABLECOIN_MINT: {}", stablecoin_mint.pubkey());
    println!("FED_CONFIG PDA: {}", fed_config_pda);
    println!("OM_CONFIG PDA: {}", om_config_pda);
    println!("OK. {} environment ready.", cluster);
}

// fn main() {
//     // Bootstrap script is currently disabled
//     // Uncomment the code above to enable bootstrap functionality
// }
