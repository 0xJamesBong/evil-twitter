use anchor_client::{
    anchor_lang::solana_program::example_mocks::solana_sdk::system_program,
    solana_sdk::commitment_config::CommitmentConfig, Client, Cluster,
};

use anchor_client::solana_sdk::{pubkey::Pubkey, signature::read_keypair_file};

use anchor_spl::token::spl_token;
use solana_sdk::{
    native_token::LAMPORTS_PER_SOL,
    signature::{Keypair, Signer},
}; // Add this import

use crate::config::TIME_CONFIG_FAST;
use crate::utils::phenomena::{
    test_phenomena_add_valid_payment, test_phenomena_create_post, test_phenomena_create_user,
    test_phenomena_deposit, test_phenomena_send_token, test_phenomena_settle_post,
    test_phenomena_tip, test_phenomena_turn_on_withdrawable, test_phenomena_vote_on_post,
    test_phenomena_withdraw,
};
use crate::utils::utils::{
    airdrop_sol_to_users, send_tx, setup_token_mint, setup_token_mint_ata_and_mint_to_many_users,
};
use opinions_market::constants::USDC_LAMPORTS_PER_USDC;
use std::collections::HashMap;

// #[tokio::test]
// async fn test_clock() {
//     let program_test = ProgramTest::default();
//     let mut context = program_test.start_with_context().await;

//     // print initial slot
//     let clock = context
//         .banks_client
//         .get_sysvar::<solana_sdk::clock::Clock>()
//         .await
//         .unwrap();
//     println!("initial slot: {}", clock.slot);

//     // --- WARP TIME (advance slots) ---
//     context.warp_to_slot(5000).unwrap(); // <—— this is the time warp

//     // print slot after warp
//     let clock2 = context
//         .banks_client
//         .get_sysvar::<solana_sdk::clock::Clock>()
//         .await
//         .unwrap();
//     println!("after warp slot: {}", clock2.slot);
//     assert_eq!(clock2.slot, 5000);
//     panic!();
// }

// #[tokio::test]
// async fn test_ping() {
//     let program_id = opinions_market::ID;
//     let anchor_wallet = std::env::var("ANCHOR_WALLET").unwrap();
//     let payer = read_keypair_file(&anchor_wallet).unwrap();

//     let client = Client::new_with_options(Cluster::Localnet, &payer, CommitmentConfig::confirmed());

//     let program = client.program(program_id).unwrap();

//     let rpc = program.rpc();
//     // let tx = program
//     //     .request()
//     //     .accounts(opinions_market::accounts::Ping {})
//     //     .args(opinions_market::instruction::Ping {})
//     //     .send()
//     //     .expect("");

//     let ix = program
//         .request()
//         .accounts(opinions_market::accounts::Ping {})
//         .args(opinions_market::instruction::Ping {})
//         .instructions()
//         .unwrap();
//     let tx = send_tx(&rpc, ix, &payer.pubkey(), &[&payer]).await.unwrap();

//     println!("Your transaction signature {}", tx);
// }

#[tokio::test]
async fn test_setup() {
    let opinions_market_program_id = opinions_market::ID;
    let persona_program_id = persona::ID;
    let referrals_program_id = referrals::ID;
    let fed_program_id = fed::ID;

    let anchor_wallet = std::env::var("ANCHOR_WALLET").unwrap();
    let payer = read_keypair_file(&anchor_wallet).unwrap();
    let payer_pubkey = &payer.pubkey();

    let admin = Keypair::new();
    let admin_pubkey = admin.pubkey();

    let session_key = Keypair::new();
    let session_key_pubkey = session_key.pubkey();

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

    let fed = client.program(fed_program_id).unwrap();
    let opinions_market = client.program(opinions_market_program_id).unwrap();
    let persona = client.program(persona_program_id).unwrap();
    let referrals = client.program(referrals_program_id).unwrap();

    let rpc = opinions_market.rpc();

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
        (session_key_pubkey, "session_key".to_string()),
        (user_1.pubkey(), "user_1".to_string()),
        (user_2.pubkey(), "user_2".to_string()),
        (user_3.pubkey(), "user_3".to_string()),
    ]);

    airdrop_sol_to_users(&rpc, &everyone).await;

    setup_token_mint(&rpc, &payer, &payer, &opinions_market, &bling_mint, 9).await;
    setup_token_mint(&rpc, &payer, &payer, &opinions_market, &usdc_mint, 6).await;
    setup_token_mint(&rpc, &payer, &payer, &opinions_market, &stablecoin_mint, 6).await;

    let bling_atas = setup_token_mint_ata_and_mint_to_many_users(
        &rpc,
        &payer,
        &mint_authority,
        &everyone.keys().cloned().collect::<Vec<Pubkey>>(),
        &opinions_market,
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
        &opinions_market,
        &usdc_mint,
        1_000_000_000 * USDC_LAMPORTS_PER_USDC, // 1 billion USDC with 6 decimals
        &bling_mint,
        &usdc_mint,
        &stablecoin_mint,
    )
    .await;

    let stablecoin_atas = setup_token_mint_ata_and_mint_to_many_users(
        &rpc,
        &payer,
        &mint_authority,
        &everyone.keys().cloned().collect::<Vec<Pubkey>>(),
        &opinions_market,
        &stablecoin_mint,
        1_000_000_000 * USDC_LAMPORTS_PER_USDC, // 1 billion Stablecoin with 6 decimals
        &bling_mint,
        &usdc_mint,
        &stablecoin_mint,
    )
    .await;

    let fed_config_pda =
        Pubkey::find_program_address(&[fed::pda_seeds::FED_CONFIG_SEED], &fed_program_id).0;
    let om_config_pda = Pubkey::find_program_address(
        &[opinions_market::pda_seeds::OM_CONFIG_SEED],
        &opinions_market_program_id,
    )
    .0;

    {
        println!("initializing fed engine");
        let protocol_bling_treasury_pda = Pubkey::find_program_address(
            &[
                fed::pda_seeds::PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED,
                bling_pubkey.as_ref(),
            ],
            &fed_program_id,
        )
        .0;

        let valid_payment_pda = Pubkey::find_program_address(
            &[fed::pda_seeds::VALID_PAYMENT_SEED, bling_pubkey.as_ref()],
            &fed_program_id,
        )
        .0;

        let initialize_fed_ix = fed
            .request()
            .accounts(fed::accounts::Initialize {
                admin: admin_pubkey,
                payer: payer_pubkey.clone(),
                fed_config: fed_config_pda,
                bling_mint: bling_pubkey,
                usdc_mint: usdc_pubkey,
                protocol_bling_treasury: protocol_bling_treasury_pda,
                valid_payment: valid_payment_pda,
                system_program: system_program::ID,
                token_program: spl_token::ID,
            })
            .args(fed::instruction::Initialize {})
            .instructions()
            .unwrap();

        let initialize_fed_tx =
            send_tx(&rpc, initialize_fed_ix, &payer.pubkey(), &[&payer, &admin])
                .await
                .unwrap();
        println!("initialize fed tx: {:?}", initialize_fed_tx);

        println!("initializing opinions market engine");
        let initialize_opinions_market_ix = opinions_market
            .request()
            .accounts(opinions_market::accounts::Initialize {
                admin: admin_pubkey,
                payer: payer_pubkey.clone(),
                om_config: om_config_pda,
                system_program: anchor_client::solana_sdk::system_program::ID,
            })
            .args(opinions_market::instruction::Initialize {
                base_duration_secs: TIME_CONFIG_FAST.base_duration_secs,
                max_duration_secs: TIME_CONFIG_FAST.max_duration_secs,
                extension_per_vote_secs: TIME_CONFIG_FAST.extension_per_vote_secs,
            })
            .instructions()
            .unwrap();

        let initialize_opinions_market_tx = send_tx(
            &rpc,
            initialize_opinions_market_ix,
            &payer.pubkey(),
            &[&payer, &admin],
        )
        .await
        .unwrap();
        println!(
            "initialize opinions market tx: {:?}",
            initialize_opinions_market_tx
        );

        // make bling withdrawable
        test_phenomena_turn_on_withdrawable(
            &rpc,
            &fed,
            &payer,
            &admin,
            &bling_pubkey,
            &fed_config_pda,
        )
        .await;

        test_phenomena_add_valid_payment(&rpc, &fed, &payer, &admin, &usdc_pubkey, &fed_config_pda)
            .await;

        // Register Stablecoin as a valid payment token
        test_phenomena_add_valid_payment(
            &rpc,
            &fed,
            &payer,
            &admin,
            &stablecoin_pubkey,
            &fed_config_pda,
        )
        .await;

        test_phenomena_create_user(&rpc, &persona, &payer, &user_1, &session_key).await;
        test_phenomena_create_user(&rpc, &persona, &payer, &user_2, &session_key).await;
        test_phenomena_create_user(&rpc, &persona, &payer, &user_3, &session_key).await;

        {
            println!("user 1 depositing 10_000_000 bling to their vault");
            test_phenomena_deposit(
                &rpc,
                &fed,
                &persona,
                &payer,
                &user_1,
                10_000_000 * LAMPORTS_PER_SOL,
                &bling_pubkey,
                &tokens,
                &bling_atas,
                &fed_config_pda,
            )
            .await;
        }
        {
            println!("user 2 depositing 1_000 usdc to their vault");
            test_phenomena_deposit(
                &rpc,
                &fed,
                &persona,
                &payer,
                &user_2,
                1_000 * USDC_LAMPORTS_PER_USDC, // 1,000 USDC with 6 decimals
                &usdc_pubkey,
                &tokens,
                &usdc_atas,
                &fed_config_pda,
            )
            .await;
        }
        {
            println!("user 1 withdrawing 9_000_000 bling from their vault to their wallet");
            test_phenomena_withdraw(
                &rpc,
                &fed,
                &persona,
                &payer,
                &user_1,
                9_000_000 * LAMPORTS_PER_SOL,
                &bling_pubkey,
                &tokens,
                &bling_atas,
            )
            .await;
        }

        {
            println!("user 2 withdrawing 900 usdc from their vault to their wallet");
            test_phenomena_withdraw(
                &rpc,
                &fed,
                &persona,
                &payer,
                &user_2,
                900 * USDC_LAMPORTS_PER_USDC, // 900 USDC with 6 decimals
                &usdc_pubkey,
                &tokens,
                &usdc_atas,
            )
            .await;
        }

        {
            println!("user 2 depositing 1_000_000 bling to their vault");
            test_phenomena_deposit(
                &rpc,
                &fed,
                &persona,
                &payer,
                &user_2,
                1_000_000 * LAMPORTS_PER_SOL,
                &bling_pubkey,
                &tokens,
                &bling_atas,
                &fed_config_pda,
            )
            .await;
        }

        {
            println!("user 1 depositing 1_000_000 usdc to their vault");
            test_phenomena_deposit(
                &rpc,
                &fed,
                &persona,
                &payer,
                &user_1,
                1_000_000 * USDC_LAMPORTS_PER_USDC, // 1,000,000 USDC with 6 decimals
                &usdc_pubkey,
                &tokens,
                &usdc_atas,
                &fed_config_pda,
            )
            .await;
        }
        {
            println!("user 1 depositing 1_000_000 stablecoin to their vault");
            test_phenomena_deposit(
                &rpc,
                &fed,
                &persona,
                &payer,
                &user_1,
                1_000_000 * USDC_LAMPORTS_PER_USDC, // 1,000,000 Stablecoin with 6 decimals
                &stablecoin_pubkey,
                &tokens,
                &stablecoin_atas,
                &fed_config_pda,
            )
            .await;
        }

        {
            println!("user 1 tipping user 2 100 bling");
            test_phenomena_tip(
                &rpc,
                &fed,
                &persona,
                &payer,
                &user_1,
                &session_key,
                &user_2,
                100 * LAMPORTS_PER_SOL,
                &bling_pubkey,
                &tokens,
            )
            .await;
        }
        {
            println!("user 1 sending 100 bling to user 2");
            test_phenomena_send_token(
                &rpc,
                &fed,
                &persona,
                &payer,
                &user_1,
                &session_key,
                &user_2,
                100 * LAMPORTS_PER_SOL,
                &bling_pubkey,
                &tokens,
            )
            .await;
        }

        //// ===== CREATING POSTS =====
        let (post_p1_pda, post_p1_id_hash) = {
            println!("user 1 creating an original post P1");
            test_phenomena_create_post(
                &rpc,
                &opinions_market,
                &persona,
                &payer,
                &user_1,
                &session_key,
                &om_config_pda,
                None, // Original post
            )
            .await
        };

        let (post_p2_pda, post_p2_id_hash) = {
            println!("user 2 creates a child post P2 of user 1's post P1");
            test_phenomena_create_post(
                &rpc,
                &opinions_market,
                &persona,
                &payer,
                &user_2,
                &session_key,
                &om_config_pda,
                Some(post_p1_pda), // Child post
            )
            .await
        };

        {
            println!("user 2 upvoting user 1's post P1");
            test_phenomena_vote_on_post(
                &rpc,
                &opinions_market,
                &fed,
                &persona,
                &payer,
                &user_2,
                &session_key,
                &post_p1_pda,
                opinions_market::states::Side::Pump,
                1,
                &bling_pubkey,
                &bling_atas,
                &om_config_pda,
                &fed_config_pda,
            )
            .await;
        }

        {
            println!("user 1 downvoting user 2's post P2");
            test_phenomena_vote_on_post(
                &rpc,
                &opinions_market,
                &fed,
                &persona,
                &payer,
                &user_1,
                &session_key,
                &post_p2_pda,
                opinions_market::states::Side::Smack,
                2,
                &bling_pubkey,
                &bling_atas,
                &om_config_pda,
                &fed_config_pda,
            )
            .await;
        }

        {
            println!("user 1 downvoting user 2's post P2");
            test_phenomena_vote_on_post(
                &rpc,
                &opinions_market,
                &fed,
                &persona,
                &payer,
                &user_1,
                &session_key,
                &post_p2_pda,
                opinions_market::states::Side::Smack,
                1,
                &bling_pubkey,
                &bling_atas,
                &om_config_pda,
                &fed_config_pda,
            )
            .await;
        }

        {
            println!("user 1 downvoting user 2's child post");
            // Note: This is the same as the previous vote since P2 is already a child post
            // If you meant a different child post, we'd need to create another one first
            test_phenomena_vote_on_post(
                &rpc,
                &opinions_market,
                &fed,
                &persona,
                &payer,
                &user_1,
                &session_key,
                &post_p2_pda,
                opinions_market::states::Side::Smack,
                1,
                &bling_pubkey,
                &bling_atas,
                &om_config_pda,
                &fed_config_pda,
            )
            .await;
        }

        {
            println!("user 1 upvoting user 2's child post with USDC");
            // Note: This is the same as the previous vote since P2 is already a child post
            // If you meant a different child post, we'd need to create another one first
            test_phenomena_vote_on_post(
                &rpc,
                &opinions_market,
                &fed,
                &persona,
                &payer,
                &user_1,
                &session_key,
                &post_p2_pda,
                opinions_market::states::Side::Pump,
                1,
                &usdc_pubkey,
                &bling_atas,
                &om_config_pda,
                &fed_config_pda,
            )
            .await;
        }

        {
            println!("user 1 upvoting user 2's child post with stablecoin");
            // Note: This is the same as the previous vote since P2 is already a child post
            // If you meant a different child post, we'd need to create another one first
            test_phenomena_vote_on_post(
                &rpc,
                &opinions_market,
                &fed,
                &persona,
                &payer,
                &user_1,
                &session_key,
                &post_p2_pda,
                opinions_market::states::Side::Pump,
                1,
                &stablecoin_pubkey,
                &stablecoin_atas,
                &om_config_pda,
                &fed_config_pda,
            )
            .await;
        }

        //         Note: In a real test, you'd need to wait for the post to expire before settling
        // For now, we'll just show the settle function exists
        {
            // wait_seconds(TIME_CONFIG_FAST.max_duration_secs as u64).await;
            println!("Settling post P1");
            test_phenomena_settle_post(
                &rpc,
                &opinions_market,
                &fed,
                &payer,
                &post_p1_pda,
                &tokens,
                &om_config_pda,
            )
            .await;
        }
        {
            println!("\n\n");
            println!(" 🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪");
            println!(" 🟪 🟪 🟪 🟪 GOD LOVES ME 🟪 🟪 🟪 🟪");
            println!(" 🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪");
            panic!();
        }

        //     {
        //         println!("\n user 2 claims their reward from user 's post");
        //         test_phenomena_claim_post_reward(
        //             &rpc,
        //             &opinions_market,
        //             &payer,
        //             &user_2,
        //             &session_key,
        //             &post_p1_pda,
        //             &bling_pubkey,
        //             &tokens,
        //             &config_pda,
        //         )
        //         .await;
        //     }

        //     {
        //         // question
        //         println!("user 1 creating a question post Q1");
        //         let (question_post_pda, question_post_id_hash) = test_phenomena_create_question(
        //             &rpc,
        //             &opinions_market,
        //             &payer,
        //             &user_1,
        //             &session_key,
        //             &config_pda,
        //         )
        //         .await;

        //         let (answer_post_pda, answer_post_id_hash) = test_phenomena_create_answer(
        //             &rpc,
        //             &opinions_market,
        //             &payer,
        //             &user_1,
        //             &session_key,
        //             &config_pda,
        //             question_post_pda,
        //             question_post_id_hash,
        //         )
        //         .await;

        //         println!("user 2 upvoting user 1's question post Q1");
        //         test_phenomena_vote_on_post(
        //             &rpc,
        //             &opinions_market,
        //             &payer,
        //             &user_2,
        //             &session_key,
        //             &question_post_pda,
        //             opinions_market::states::Side::Pump,
        //             1,
        //             &bling_pubkey,
        //             &bling_atas,
        //             &config_pda,
        //         )
        //         .await;

        //         println!("user 2 upvoting user 1's answer post A1");
        //         test_phenomena_vote_on_post(
        //             &rpc,
        //             &opinions_market,
        //             &payer,
        //             &user_2,
        //             &session_key,
        //             &answer_post_pda,
        //             opinions_market::states::Side::Pump,
        //             1,
        //             &bling_pubkey,
        //             &bling_atas,
        //             &config_pda,
        //         )
        //         .await;
        //     };

        //     // {
        //     //     println!("user 3 trying to make a post");
        //     //     // This would Cause an error because user 3 is not a user in the system
        //     //     test_phenomena_create_post(
        //     //         &rpc,
        //     //         &opinions_market,
        //     //         &payer,
        //     //         &user_3,
        //     //         &bling_pubkey,
        //     //         &config_pda,
        //     //     )
        //     //     .await;
        //     // }
    }
}
