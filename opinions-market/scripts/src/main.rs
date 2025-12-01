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

use opinions_market::pda_seeds::*;
use opinions_market::ID;

use tests::utils::utils::{
    airdrop_sol_to_users, send_tx, setup_token_mint, setup_token_mint_ata_and_mint_to_many_users,
};

#[tokio::main]
async fn main() {
    let anchor_wallet = std::env::var("ANCHOR_WALLET").unwrap();
    let payer = read_keypair_file(&anchor_wallet).unwrap();

    let program_id = ID;
    let client = Client::new_with_options(Cluster::Localnet, &payer, CommitmentConfig::processed());
    let opinions_market = client.program(program_id).unwrap();
    let rpc = opinions_market.rpc();

    // --- USERS ---
    let admin = Keypair::new();
    let admin_pubkey = admin.pubkey();

    // Read the backend payer keypair from secrets
    let chauhai =
        read_keypair_file(".secrets/xxxmpaGinzux2NwdPiGaxXsR4EAsYLhaA87g75H3V5X.json").unwrap();
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
    airdrop_sol_to_users(&rpc, &everyone).await;

    // --- CREATE MINTS ---
    setup_token_mint(&rpc, &payer, &payer, &opinions_market, &bling_mint).await;
    setup_token_mint(&rpc, &payer, &payer, &opinions_market, &usdc_mint).await;
    setup_token_mint(&rpc, &payer, &payer, &opinions_market, &stablecoin_mint).await;

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
    // MINT USDC TO EVERYONE
    setup_token_mint_ata_and_mint_to_many_users(
        &rpc,
        &payer,
        &payer,
        &everyone.keys().cloned().collect::<Vec<Pubkey>>(),
        &opinions_market,
        &usdc_mint,
        1_000_000_000 * LAMPORTS_PER_SOL,
        &bling_mint,
        &usdc_mint,
        &stablecoin_mint,
    )
    .await;

    // MINT STABLECOIN TO EVERYONE
    setup_token_mint_ata_and_mint_to_many_users(
        &rpc,
        &payer,
        &payer,
        &everyone.keys().cloned().collect::<Vec<Pubkey>>(),
        &opinions_market,
        &stablecoin_mint,
        1_000_000_000 * LAMPORTS_PER_SOL,
        &bling_mint,
        &usdc_mint,
        &stablecoin_mint,
    )
    .await;

    // --- CONFIG PDA ---
    let config_pda = Pubkey::find_program_address(&[CONFIG_SEED], &program_id).0;
    let protocol_bling_treasury = Pubkey::find_program_address(
        &[
            PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED,
            bling_mint.pubkey().as_ref(),
        ],
        &program_id,
    )
    .0;
    let valid_payment_pda = Pubkey::find_program_address(
        &[VALID_PAYMENT_SEED, bling_mint.pubkey().as_ref()],
        &program_id,
    )
    .0;

    // --- INITIALIZE PROGRAM ---
    let initialize_ix = opinions_market
        .request()
        .accounts(opinions_market::accounts::Initialize {
            admin: admin_pubkey,
            payer: payer.pubkey(),
            config: config_pda,
            bling_mint: bling_mint.pubkey(),
            usdc_mint: usdc_mint.pubkey(),
            protocol_bling_treasury,
            valid_payment: valid_payment_pda,
            system_program: anchor_lang::solana_program::system_program::ID,
            token_program: anchor_spl::token::spl_token::ID,
        })
        .args(opinions_market::instruction::Initialize {
            base_duration_secs: 24 * 3600,    // 1 day
            max_duration_secs: 7 * 24 * 3600, // 7 days
            extension_per_vote_secs: 60,      // 1min
        })
        .instructions()
        .unwrap();

    send_tx(&rpc, initialize_ix, &payer.pubkey(), &[&payer, &admin])
        .await
        .unwrap();

    println!("BLING_MINT: {}", bling_mint.pubkey());
    println!("USDC_MINT: {}", usdc_mint.pubkey());
    println!("CONFIG PDA: {}", config_pda);
    println!("OK. Local environment ready.");
}
