use anchor_client::anchor_lang::solana_program::example_mocks::solana_sdk::system_program;
use anchor_client::Program;
use anchor_spl::token::spl_token;
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::{signature::Keypair, signer::Signer};

use crate::utils::definitions::RATES;
use crate::utils::utils::send_tx;
use opinions_market_engine::pda_seeds::*;

pub async fn test_phenomena() {}

pub async fn test_phenomena_add_alternative_payment(
    rpc: &RpcClient,
    opinions_market_engine: &Program<&Keypair>,
    payer: &Keypair,
    admin: &Keypair,
    new_token_mint: &Pubkey,
) {
    println!("adding {:} as an alternative payment mint", new_token_mint);
    let config_pda = Pubkey::find_program_address(&[b"config"], &opinions_market_engine.id()).0;

    // adding usdc as an alternative payment mint
    let alternative_payment_pda = Pubkey::find_program_address(
        &[ACCEPTED_MINT_SEED, new_token_mint.as_ref()],
        &opinions_market_engine.id(),
    )
    .0;

    // BEFORE: Verify USDC is NOT an alternative payment mint (account doesn't exist)
    let account_before = opinions_market_engine
        .account::<opinions_market_engine::state::AlternativePayment>(alternative_payment_pda)
        .await;
    assert!(
        account_before.is_err(),
        "USDC should NOT be registered as alternative payment before registration"
    );
    println!("✅ Verified: USDC is NOT registered before registration");
    let treasury_token_account_pda = Pubkey::find_program_address(
        &[PROTOCOL_TREASURY_SEED, new_token_mint.as_ref()],
        &opinions_market_engine.id(),
    )
    .0;
    let register_alternative_payment_ix = opinions_market_engine
        .request()
        .accounts(
            opinions_market_engine::accounts::RegisterAlternativePayment {
                config: config_pda,
                admin: admin.pubkey(),
                token_mint: new_token_mint.clone(),
                alternative_payment: alternative_payment_pda,
                treasury_token_account: treasury_token_account_pda,
                system_program: system_program::ID,
                token_program: spl_token::ID,
            },
        )
        .args(
            opinions_market_engine::instruction::RegisterAlternativePayment {
                price_in_bling: RATES.usdc_to_bling,
            },
        )
        .instructions()
        .unwrap();

    let register_alternative_payment_tx = send_tx(
        &rpc,
        register_alternative_payment_ix,
        &payer.pubkey(),
        &[&payer, &admin],
    )
    .await
    .unwrap();
    println!(
        "register alternative payment tx: {:?}",
        register_alternative_payment_tx
    );

    // AFTER: Verify USDC IS an alternative payment mint (account exists and is enabled)
    let account_after = opinions_market_engine
        .account::<opinions_market_engine::state::AlternativePayment>(alternative_payment_pda)
        .await
        .unwrap();
    assert_eq!(
        account_after.token_mint, *new_token_mint,
        "Token mint should match USDC"
    );
    assert!(
        account_after.enabled,
        "USDC should be enabled as alternative payment"
    );
    assert_eq!(
        account_after.price_in_bling, RATES.usdc_to_bling,
        "Price in BLING should match the registered rate"
    );
}

pub async fn test_phenomena_create_user(
    rpc: &RpcClient,
    opinions_market_engine: &Program<&Keypair>,
    payer: &Keypair,
    user: &Keypair,
) {
    println!("creating user 1");
    let user_account_pda = Pubkey::find_program_address(
        &[USER_ACCOUNT_SEED, user.pubkey().as_ref()],
        &opinions_market_engine.id(),
    )
    .0;

    let create_user_ix = opinions_market_engine
        .request()
        .accounts(opinions_market_engine::accounts::CreateUser {
            authority: user.pubkey(),
            user_account: user_account_pda,
            system_program: system_program::ID,
        })
        .args(opinions_market_engine::instruction::CreateUser {})
        .instructions()
        .unwrap();

    let create_user_tx = send_tx(&rpc, create_user_ix, &payer.pubkey(), &[&payer, &user])
        .await
        .unwrap();
    println!("create user tx: {:?}", create_user_tx);

    // Verify user account was created
    let user_account = opinions_market_engine
        .account::<opinions_market_engine::state::UserAccount>(user_account_pda)
        .await
        .unwrap();
    assert_eq!(user_account.authority_wallet, user.pubkey());
    println!("✅ User account created successfully");
}

pub async fn test_phenomena_deposit() {}

pub async fn test_phenomena_withdraw() {}

pub async fn test_phenomena_create_post() {}

pub async fn test_phenomena_vote_on_post() {}

pub async fn test_phenomena_settle_post() {}

// pub async fn test_phenomena_claim_post_reward() {}
