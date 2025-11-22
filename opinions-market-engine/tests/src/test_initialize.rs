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
    test_phenomena_add_alternative_payment, test_phenomena_create_user, test_phenomena_deposit,
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

        let initialize_ix = opinions_market_engine
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

        test_phenomena_add_alternative_payment(
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

        test_phenomena_deposit(
            &rpc,
            &opinions_market_engine,
            &payer,
            &user_1,
            &bling_pubkey,
            &bling_atas,
            &config_pda,
        )
        .await;

        // {
        //     println!("user 1 depositing 10_000_000 bling to their vault");
        //     let deposit_amount = 10_000_000;

        //     let user_account_pda = Pubkey::find_program_address(
        //         &[USER_ACCOUNT_SEED, user_1_pubkey.as_ref()],
        //         &program_id,
        //     )
        //     .0;

        //     let vault_authority_pda =
        //         Pubkey::find_program_address(&[VAULT_AUTHORITY_SEED], &program_id).0;

        //     let vault_token_account_pda = Pubkey::find_program_address(
        //         &[
        //             VAULT_TOKEN_ACCOUNT_SEED,
        //             user_1_pubkey.as_ref(),
        //             bling_pubkey.as_ref(),
        //         ],
        //         &program_id,
        //     )
        //     .0;

        //     let user_bling_ata = bling_atas.get(&user_1_pubkey).unwrap();

        //     // For BLING deposits, accepted_alternative_payment can be a dummy account
        //     // (the function will skip validation for BLING)
        //     let deposit_ix = program
        //         .request()
        //         .accounts(opinions_market_engine::accounts::Deposit {
        //             user: user_1_pubkey,
        //             user_account: user_account_pda,
        //             config: config_pda,
        //             token_mint: bling_pubkey,
        //             accepted_alternative_payment: Some(config_pda), // Dummy account for BLING (validation skipped)
        //             user_token_ata: *user_bling_ata,
        //             vault_authority: vault_authority_pda,
        //             vault_token_account: vault_token_account_pda,
        //             token_program: spl_token::ID,
        //             system_program: system_program::ID,
        //         })
        //         .args(opinions_market_engine::instruction::Deposit {
        //             amount: deposit_amount,
        //         })
        //         .instructions()
        //         .unwrap();

        //     let deposit_tx = send_tx(&rpc, deposit_ix, &payer.pubkey(), &[&payer, &user_1])
        //         .await
        //         .unwrap();
        //     println!("deposit tx: {:?}", deposit_tx);

        //     // Verify vault balance
        //     let vault_balance = program
        //         .account::<anchor_spl::token::TokenAccount>(vault_token_account_pda)
        //         .await
        //         .unwrap();
        //     assert_eq!(vault_balance.amount, deposit_amount);
        //     println!(
        //         "✅ Deposit successful. Vault balance: {}",
        //         vault_balance.amount
        //     );
        // }

        {
            println!("user 1 withdrawing 9_000_000 bling from their vault to their wallet");
            let withdraw_amount = 9_000_000;

            let user_account_pda = Pubkey::find_program_address(
                &[USER_ACCOUNT_SEED, user_1_pubkey.as_ref()],
                &program_id,
            )
            .0;

            let vault_authority_pda =
                Pubkey::find_program_address(&[VAULT_AUTHORITY_SEED], &program_id).0;

            let vault_token_account_pda = Pubkey::find_program_address(
                &[
                    VAULT_TOKEN_ACCOUNT_SEED,
                    user_1_pubkey.as_ref(),
                    bling_pubkey.as_ref(),
                ],
                &program_id,
            )
            .0;

            let user_bling_ata = bling_atas.get(&user_1_pubkey).unwrap();

            let withdraw_ix = opinions_market_engine
                .request()
                .accounts(opinions_market_engine::accounts::Withdraw {
                    user: user_1_pubkey,
                    user_account: user_account_pda,
                    token_mint: bling_pubkey,
                    user_token_dest_ata: *user_bling_ata,
                    vault_token_account: vault_token_account_pda,
                    vault_authority: vault_authority_pda,
                    token_program: spl_token::ID,
                })
                .args(opinions_market_engine::instruction::Withdraw {
                    amount: withdraw_amount,
                })
                .instructions()
                .unwrap();

            let withdraw_tx = send_tx(&rpc, withdraw_ix, &payer.pubkey(), &[&payer, &user_1])
                .await
                .unwrap();
            println!("withdraw tx: {:?}", withdraw_tx);

            // Verify vault balance decreased
            let vault_balance = opinions_market_engine
                .account::<anchor_spl::token::TokenAccount>(vault_token_account_pda)
                .await
                .unwrap();
            assert_eq!(vault_balance.amount, 10_000_000 - withdraw_amount);
            println!(
                "✅ Withdraw successful. Vault balance: {}",
                vault_balance.amount
            );

            // Verify user wallet balance increased
            let user_balance = opinions_market_engine
                .account::<anchor_spl::token::TokenAccount>(*user_bling_ata)
                .await
                .unwrap();
            println!("✅ User wallet balance: {}", user_balance.amount);
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
