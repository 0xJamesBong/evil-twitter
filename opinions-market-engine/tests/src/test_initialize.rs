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
use crate::utils::phenomena::test_phenomena_add_alternative_payment;
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

    let program = client.program(program_id).unwrap();
    let rpc = program.rpc();

    let bling_mint = Keypair::new();
    let bling_pubkey = bling_mint.pubkey();

    let usdc_mint = Keypair::new();
    let usdc_pubkey = usdc_mint.pubkey();

    let stablecoin_mint = Keypair::new();
    let stablecoin_pubkey = stablecoin_mint.pubkey();

    let everyone = HashMap::from([
        (payer.pubkey(), "payer".to_string()),
        (admin.pubkey(), "admin".to_string()), // admin is the owner of the opinions market engine program
        (user_1.pubkey(), "user_1".to_string()),
        (user_2.pubkey(), "user_2".to_string()),
        (user_3.pubkey(), "user_3".to_string()),
    ]);

    airdrop_sol_to_users(&rpc, &everyone).await;

    setup_token_mint(&rpc, &payer, &payer, &program, &bling_mint).await;
    setup_token_mint(&rpc, &payer, &payer, &program, &usdc_mint).await;
    setup_token_mint(&rpc, &payer, &payer, &program, &stablecoin_mint).await;

    let bling_atas = setup_token_mint_ata_and_mint_to_many_users(
        &rpc,
        &payer,
        &mint_authority,
        &everyone.keys().cloned().collect::<Vec<Pubkey>>(),
        &program,
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
        &program,
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

    {
        println!("initializing opinions market engine");
        let config_pda = Pubkey::find_program_address(&[b"config"], &program_id).0;
        let protocol_bling_treasury_pda = Pubkey::find_program_address(
            &[PROTOCOL_TREASURY_SEED, bling_pubkey.as_ref()],
            &program_id,
        )
        .0;

        let initialize_ix = program
            .request()
            .accounts(opinions_market_engine::accounts::Initialize {
                admin: admin_pubkey,
                payer: payer_pubkey.clone(),
                config: config_pda,
                bling_mint: bling_pubkey,
                usdc_mint: usdc_pubkey,
                protocol_bling_treasury: protocol_bling_treasury_pda,
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

        test_phenomena_add_alternative_payment(&rpc, &program, &payer, &admin, &usdc_pubkey).await;

        // {
        //     println!("adding usdc as an alternative payment mint");

        //     // adding usdc as an alternative payment mint
        //     let alternative_payment_pda = Pubkey::find_program_address(
        //         &[ACCEPTED_MINT_SEED, usdc_pubkey.as_ref()],
        //         &program_id,
        //     )
        //     .0;

        //     // BEFORE: Verify USDC is NOT an alternative payment mint (account doesn't exist)
        //     let account_before = program
        //         .account::<opinions_market_engine::state::AlternativePayment>(
        //             alternative_payment_pda,
        //         )
        //         .await;
        //     assert!(
        //         account_before.is_err(),
        //         "USDC should NOT be registered as alternative payment before registration"
        //     );
        //     println!("✅ Verified: USDC is NOT registered before registration");
        //     let treasury_token_account_pda = Pubkey::find_program_address(
        //         &[PROTOCOL_TREASURY_SEED, usdc_pubkey.as_ref()],
        //         &program_id,
        //     )
        //     .0;
        //     let register_alternative_payment_ix = program
        //         .request()
        //         .accounts(
        //             opinions_market_engine::accounts::RegisterAlternativePayment {
        //                 config: config_pda,
        //                 admin: admin_pubkey,
        //                 token_mint: usdc_pubkey,
        //                 alternative_payment: alternative_payment_pda,
        //                 treasury_token_account: treasury_token_account_pda,
        //                 system_program: system_program::ID,
        //                 token_program: spl_token::ID,
        //             },
        //         )
        //         .args(
        //             opinions_market_engine::instruction::RegisterAlternativePayment {
        //                 price_in_bling: RATES.usdc_to_bling,
        //             },
        //         )
        //         .instructions()
        //         .unwrap();

        //     let register_alternative_payment_tx = send_tx(
        //         &rpc,
        //         register_alternative_payment_ix,
        //         &payer.pubkey(),
        //         &[&payer, &admin],
        //     )
        //     .await
        //     .unwrap();
        //     println!(
        //         "register alternative payment tx: {:?}",
        //         register_alternative_payment_tx
        //     );

        //     // AFTER: Verify USDC IS an alternative payment mint (account exists and is enabled)
        //     let account_after = program
        //         .account::<opinions_market_engine::state::AlternativePayment>(
        //             alternative_payment_pda,
        //         )
        //         .await
        //         .unwrap();
        //     assert_eq!(
        //         account_after.token_mint, usdc_pubkey,
        //         "Token mint should match USDC"
        //     );
        //     assert!(
        //         account_after.enabled,
        //         "USDC should be enabled as alternative payment"
        //     );
        //     assert_eq!(
        //         account_after.price_in_bling, RATES.usdc_to_bling,
        //         "Price in BLING should match the registered rate"
        //     );
        //     println!("✅ Verified: USDC IS registered and enabled as alternative payment");
        // }

        println!("\n\n");
        println!(" 🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪");
        println!("🟪 GOD LOVES ME 🟪");
        println!(" 🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪");
        panic!();
    }
}
