// // Migrated test_setup using ProgramTest with time warping
// // This version uses BanksClient instead of RPC, allowing us to warp time

// use anchor_client::solana_sdk::pubkey::Pubkey;
// use anchor_client::{
//     anchor_lang::solana_program::example_mocks::solana_sdk::system_program,
//     solana_sdk::commitment_config::CommitmentConfig, Client, Cluster,
// };
// use anchor_spl::token::spl_token;
// use solana_program_test::ProgramTest;
// use solana_sdk::{
//     native_token::LAMPORTS_PER_SOL,
//     signature::{Keypair, Signer},
// };

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
// }
