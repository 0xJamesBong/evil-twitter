use anchor_client::{
    anchor_lang::solana_program::example_mocks::solana_sdk::system_program,
    solana_sdk::commitment_config::CommitmentConfig, Client, Cluster,
};

use anchor_spl::token::spl_token;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::{
    native_token::LAMPORTS_PER_SOL,
    signature::{read_keypair_file, Keypair, Signer},
}; // Add this import

use crate::utils::definitions::RATES;
use crate::utils::phenomena::{
    test_phenomena_add_valid_payment, test_phenomena_create_user, test_phenomena_deposit,
    test_phenomena_withdraw,
};
use crate::utils::utils::{
    airdrop_sol_to_users, send_tx, setup_token_mint, setup_token_mint_ata_and_mint_to,
    setup_token_mint_ata_and_mint_to_many_users,
};
use opinions_market_engine::pda_seeds::*;

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

    let admin = Keypair::new();
    let admin_pubkey = admin.pubkey();

    // admin will be the mint authority of EVERYTHING
    let mint_authority = &payer;
    let mint_authority_pubkey = mint_authority.pubkey();

    let user_1 = Keypair::new();
    let user_1_pubkey = user_1.pubkey();

    let user_2 = Keypair::new();
    let user_2_pubkey = user_2.pubkey();

    let user_3 = Keypair::new();
    let user_3_pubkey = user_3.pubkey();

    let client = Client::new_with_options(Cluster::Localnet, &payer, CommitmentConfig::confirmed());

    let opinions_market_engine = client.program(program_id).unwrap();
    let rpc = opinions_market_engine.rpc();

    let bling_mint = Keypair::new();
    let bling_pubkey = bling_mint.pubkey();

    let usdc_mint = Keypair::new();
    let usdc_pubkey = usdc_mint.pubkey();

    let stablecoin_mint = Keypair::new();
    let stablecoin_pubkey = stablecoin_mint.pubkey();

    let tokens = HashMap::from([
        (bling_pubkey, "bling".to_string()),
        (usdc_pubkey, "usdc".to_string()),
        (stablecoin_pubkey, "stablecoin".to_string()),
    ]);

    let everyone = HashMap::from([
        (payer.pubkey(), "payer".to_string()),
        (admin.pubkey(), "admin".to_string()), // admin is the owner of the opinions market engine program
        (user_1.pubkey(), "user_1".to_string()),
        (user_2.pubkey(), "user_2".to_string()),
        (user_3.pubkey(), "user_3".to_string()),
    ]);

    airdrop_sol_to_users(&rpc, &everyone).await;

    setup_token_mint(&rpc, &payer, &payer, &opinions_market_engine, &bling_mint).await;
    setup_token_mint(&rpc, &payer, &payer, &opinions_market_engine, &usdc_mint).await;
    setup_token_mint(
        &rpc,
        &payer,
        &payer,
        &opinions_market_engine,
        &stablecoin_mint,
    )
    .await;

    let bling_atas = setup_token_mint_ata_and_mint_to_many_users(
        &rpc,
        &payer,
        &mint_authority,
        &everyone.keys().cloned().collect::<Vec<Pubkey>>(),
        &opinions_market_engine,
        &bling_mint,
        1_000_000_000 * LAMPORTS_PER_SOL,
        &bling_mint,
        &usdc_mint,
        &stablecoin_mint,
    )
    .await;

    let usdc_atas = setup_token_mint_ata_and_mint_to_many_users(
        &rpc,
        &payer,
        &mint_authority,
        &everyone.keys().cloned().collect::<Vec<Pubkey>>(),
        &opinions_market_engine,
        &usdc_mint,
        1_000_000_000 * LAMPORTS_PER_SOL,
        &bling_mint,
        &usdc_mint,
        &stablecoin_mint,
    )
    .await;

    // let stablecoin_atas = setup_token_mint_ata_and_mint_to_many_users(
    //     &rpc,
    //     &payer,
    //     &mint_authority,
    //     &everyone.keys().cloned().collect::<Vec<Pubkey>>(),
    //     &program,
    //     &stablecoin_mint,
    //     1_000_000_000 * LAMPORTS_PER_SOL,
    //     &bling_mint,
    //     &usdc_mint,
    //     &stablecoin_mint,
    // )
    // .await;

    let config_pda = Pubkey::find_program_address(&[b"config"], &program_id).0;

    {
        println!("initializing opinions market engine");
        let protocol_bling_treasury_pda = Pubkey::find_program_address(
            &[PROTOCOL_TREASURY_SEED, bling_pubkey.as_ref()],
            &program_id,
        )
        .0;

        let valid_payment_pda =
            Pubkey::find_program_address(&[VALID_PAYMENT_SEED, bling_pubkey.as_ref()], &program_id)
                .0;

        let initialize_ix = opinions_market_engine
            .request()
            .accounts(opinions_market_engine::accounts::Initialize {
                admin: admin_pubkey,
                payer: payer_pubkey.clone(),
                config: config_pda,
                bling_mint: bling_pubkey,
                usdc_mint: usdc_pubkey,
                protocol_bling_treasury: protocol_bling_treasury_pda,
                valid_payment: valid_payment_pda,
                system_program: system_program::ID,
                token_program: spl_token::ID,
            })
            .args(opinions_market_engine::instruction::Initialize {
                protocol_fee_bps: 0,
                creator_fee_bps_pump: 0,
            })
            .instructions()
            .unwrap();

        let initialize_tx = send_tx(&rpc, initialize_ix, &payer.pubkey(), &[&payer, &admin])
            .await
            .unwrap();
        println!("initialize tx: {:?}", initialize_tx);

        test_phenomena_add_valid_payment(
            &rpc,
            &opinions_market_engine,
            &payer,
            &admin,
            &usdc_pubkey,
        )
        .await;

        test_phenomena_create_user(&rpc, &opinions_market_engine, &payer, &user_1).await;
        test_phenomena_create_user(&rpc, &opinions_market_engine, &payer, &user_2).await;
        test_phenomena_create_user(&rpc, &opinions_market_engine, &payer, &user_3).await;

        {
            println!("user 1 depositing 10_000_000 bling to their vault");
            test_phenomena_deposit(
                &rpc,
                &opinions_market_engine,
                &payer,
                &user_1,
                10_000_000 * LAMPORTS_PER_SOL,
                &bling_pubkey,
                &tokens,
                &bling_atas,
                &config_pda,
            )
            .await;
        }

        {
            println!("user 2 depositing 1_000 usdc to their vault");
            test_phenomena_deposit(
                &rpc,
                &opinions_market_engine,
                &payer,
                &user_2,
                1_000 * LAMPORTS_PER_SOL,
                &usdc_pubkey,
                &tokens,
                &usdc_atas,
                &config_pda,
            )
            .await;
        }
        {
            println!("user 1 withdrawing 9_000_000 bling from their vault to their wallet");
            test_phenomena_withdraw(
                &rpc,
                &opinions_market_engine,
                &payer,
                &user_1,
                9_000_000 * LAMPORTS_PER_SOL,
                &bling_pubkey,
                &tokens,
                &bling_atas,
            )
            .await;
        }

        // {
        //     println!("user 1 depositing 1_000 usdc to their vault");
        // }

        // {
        //     println!("user 1 withdrawing 900 usdc from their vault to their wallet");
        // }

        {
            println!("user 1 makes a post")
        }

        println!("\n\n");
        println!(" 🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪");
        println!("🟪 GOD LOVES ME 🟪");
        println!(" 🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪");
        panic!();
    }
}
