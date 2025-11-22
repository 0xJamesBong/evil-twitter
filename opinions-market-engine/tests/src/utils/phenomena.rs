use std::collections::HashMap;

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

pub async fn test_phenomena_add_valid_payment(
    rpc: &RpcClient,
    opinions_market_engine: &Program<&Keypair>,
    payer: &Keypair,
    admin: &Keypair,
    new_token_mint: &Pubkey,
) {
    println!("adding {:} as an valid payment mint", new_token_mint);
    let config_pda = Pubkey::find_program_address(&[b"config"], &opinions_market_engine.id()).0;

    // adding usdc as an valid payment mint
    let valid_payment_pda = Pubkey::find_program_address(
        &[VALID_PAYMENT_SEED, new_token_mint.as_ref()],
        &opinions_market_engine.id(),
    )
    .0;

    // BEFORE: Verify USDC is NOT an valid payment mint (account doesn't exist)
    let account_before = opinions_market_engine
        .account::<opinions_market_engine::state::ValidPayment>(valid_payment_pda)
        .await;
    assert!(
        account_before.is_err(),
        "USDC should NOT be registered as valid payment before registration"
    );
    println!("✅ Verified: USDC is NOT registered before registration");
    let treasury_token_account_pda = Pubkey::find_program_address(
        &[PROTOCOL_TREASURY_SEED, new_token_mint.as_ref()],
        &opinions_market_engine.id(),
    )
    .0;
    let register_valid_payment_ix = opinions_market_engine
        .request()
        .accounts(opinions_market_engine::accounts::RegisterValidPayment {
            config: config_pda,
            admin: admin.pubkey(),
            token_mint: new_token_mint.clone(),
            valid_payment: valid_payment_pda,
            treasury_token_account: treasury_token_account_pda,
            system_program: system_program::ID,
            token_program: spl_token::ID,
        })
        .args(opinions_market_engine::instruction::RegisterValidPayment {
            price_in_bling: RATES.usdc_to_bling,
        })
        .instructions()
        .unwrap();

    let register_valid_payment_tx = send_tx(
        &rpc,
        register_valid_payment_ix,
        &payer.pubkey(),
        &[&payer, &admin],
    )
    .await
    .unwrap();
    println!("register valid payment tx: {:?}", register_valid_payment_tx);

    // AFTER: Verify USDC IS an valid payment mint (account exists and is enabled)
    let account_after = opinions_market_engine
        .account::<opinions_market_engine::state::ValidPayment>(valid_payment_pda)
        .await
        .unwrap();
    assert_eq!(
        account_after.token_mint, *new_token_mint,
        "Token mint should match USDC"
    );
    assert!(
        account_after.enabled,
        "USDC should be enabled as valid payment"
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

pub async fn test_phenomena_deposit(
    rpc: &RpcClient,
    opinions_market_engine: &Program<&Keypair>,
    payer: &Keypair,
    user: &Keypair,
    amount: u64,
    token_mint: &Pubkey,
    tokens: &HashMap<Pubkey, String>,
    token_atas: &HashMap<Pubkey, Pubkey>,
    config_pda: &Pubkey,
) {
    let token_name = tokens.get(token_mint).unwrap();
    println!("depositing {:} {:} to their vault", amount, token_name);

    let user_account_pda = Pubkey::find_program_address(
        &[USER_ACCOUNT_SEED, user.pubkey().as_ref()],
        &opinions_market_engine.id(),
    )
    .0;

    let vault_authority_pda =
        Pubkey::find_program_address(&[VAULT_AUTHORITY_SEED], &opinions_market_engine.id()).0;

    let vault_token_account_pda = Pubkey::find_program_address(
        &[
            VAULT_TOKEN_ACCOUNT_SEED,
            user.pubkey().as_ref(),
            token_mint.as_ref(),
        ],
        &opinions_market_engine.id(),
    )
    .0;

    let valid_payment_pda = Pubkey::find_program_address(
        &[VALID_PAYMENT_SEED, token_mint.as_ref()],
        &opinions_market_engine.id(),
    )
    .0;

    let user_bling_ata = token_atas.get(&user.pubkey()).unwrap();

    // For BLING deposits, accepted_valid_payment can be a dummy account
    // (the function will skip validation for BLING)
    let deposit_ix = opinions_market_engine
        .request()
        .accounts(opinions_market_engine::accounts::Deposit {
            user: user.pubkey(),
            user_account: user_account_pda,
            token_mint: token_mint.clone(),
            valid_payment: valid_payment_pda,
            user_token_ata: *user_bling_ata,
            vault_authority: vault_authority_pda,
            vault_token_account: vault_token_account_pda,
            token_program: spl_token::ID,
            system_program: system_program::ID,
        })
        .args(opinions_market_engine::instruction::Deposit { amount: amount })
        .instructions()
        .unwrap();

    let deposit_tx = send_tx(&rpc, deposit_ix, &payer.pubkey(), &[&payer, &user])
        .await
        .unwrap();
    println!("deposit tx: {:?}", deposit_tx);

    // Verify vault balance
    let vault_balance = opinions_market_engine
        .account::<anchor_spl::token::TokenAccount>(vault_token_account_pda)
        .await
        .unwrap();
    assert_eq!(vault_balance.amount, amount);
    println!(
        "✅ Deposit successful. Vault balance: {}",
        vault_balance.amount
    );
}

pub async fn test_phenomena_withdraw(
    rpc: &RpcClient,
    opinions_market_engine: &Program<&Keypair>,
    payer: &Keypair,
    user: &Keypair,
    amount: u64,
    token_mint: &Pubkey,
    tokens: &HashMap<Pubkey, String>,
    token_atas: &HashMap<Pubkey, Pubkey>,
) {
    let token_name = tokens.get(token_mint).unwrap();
    println!(
        "withdrawing {:} {:} from their vault to their wallet",
        amount, token_name
    );

    let user_account_pda = Pubkey::find_program_address(
        &[USER_ACCOUNT_SEED, user.pubkey().as_ref()],
        &opinions_market_engine.id(),
    )
    .0;

    let vault_authority_pda =
        Pubkey::find_program_address(&[VAULT_AUTHORITY_SEED], &opinions_market_engine.id()).0;

    let vault_token_account_pda = Pubkey::find_program_address(
        &[
            VAULT_TOKEN_ACCOUNT_SEED,
            user.pubkey().as_ref(),
            token_mint.as_ref(),
        ],
        &opinions_market_engine.id(),
    )
    .0;

    let vault_balance_original = opinions_market_engine
        .account::<anchor_spl::token::TokenAccount>(vault_token_account_pda)
        .await
        .unwrap()
        .amount;

    let user_token_ata = token_atas.get(&user.pubkey()).unwrap();

    let withdraw_ix = opinions_market_engine
        .request()
        .accounts(opinions_market_engine::accounts::Withdraw {
            user: user.pubkey(),
            user_account: user_account_pda,
            token_mint: token_mint.clone(),
            user_token_dest_ata: *user_token_ata,
            vault_token_account: vault_token_account_pda,
            vault_authority: vault_authority_pda,
            token_program: spl_token::ID,
        })
        .args(opinions_market_engine::instruction::Withdraw { amount })
        .instructions()
        .unwrap();

    let withdraw_tx = send_tx(&rpc, withdraw_ix, &payer.pubkey(), &[&payer, &user])
        .await
        .unwrap();
    println!("withdraw tx: {:?}", withdraw_tx);

    // Verify vault balance decreased
    let vault_balance = opinions_market_engine
        .account::<anchor_spl::token::TokenAccount>(vault_token_account_pda)
        .await
        .unwrap();
    assert_eq!(vault_balance.amount, vault_balance_original - amount);
    println!(
        "✅ Withdraw successful. Vault balance: {}",
        vault_balance.amount
    );

    // Verify user wallet balance increased
    let user_balance = opinions_market_engine
        .account::<anchor_spl::token::TokenAccount>(*user_token_ata)
        .await
        .unwrap();
    println!("✅ User wallet balance: {}", user_balance.amount);
}

pub async fn test_phenomena_create_post() {}

pub async fn test_phenomena_vote_on_post() {}

pub async fn test_phenomena_settle_post() {}

// pub async fn test_phenomena_claim_post_reward() {}
