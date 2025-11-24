use std::collections::HashMap;

use anchor_client::anchor_lang::solana_program::example_mocks::solana_sdk::system_program;
use anchor_client::Program;
use anchor_spl::associated_token::spl_associated_token_account;
use anchor_spl::associated_token::spl_associated_token_account::instruction::create_associated_token_account;
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
        &[
            PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED,
            new_token_mint.as_ref(),
        ],
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
            protocol_token_treasury_token_account: treasury_token_account_pda,
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
            user: user.pubkey(),
            payer: payer.pubkey(),
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

    assert_eq!(
        user_account.user,
        user.pubkey(),
        "User account should store the wallet pubkey"
    );

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
            USER_VAULT_TOKEN_ACCOUNT_SEED,
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
            user_vault_token_account: vault_token_account_pda,
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
            USER_VAULT_TOKEN_ACCOUNT_SEED,
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
            user_vault_token_account: vault_token_account_pda,
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

pub async fn test_phenomena_create_post(
    rpc: &RpcClient,
    opinions_market_engine: &Program<&Keypair>,
    payer: &Keypair,
    creator: &Keypair,
    config_pda: &Pubkey,
    parent_post_pda: Option<Pubkey>,
) -> Pubkey {
    let post_type_str = if parent_post_pda.is_some() {
        "child post"
    } else {
        "original post"
    };
    println!("{:} makes a {}", creator.pubkey(), post_type_str);

    // Generate a unique post_id_hash
    let hash = crate::utils::utils::generate_post_id_hash();

    let user_account_pda = Pubkey::find_program_address(
        &[USER_ACCOUNT_SEED, creator.pubkey().as_ref()],
        &opinions_market_engine.id(),
    )
    .0;

    let post_pda = Pubkey::find_program_address(
        &[POST_ACCOUNT_SEED, hash.as_ref()],
        &opinions_market_engine.id(),
    )
    .0;

    let create_post_ix = opinions_market_engine
        .request()
        .accounts(opinions_market_engine::accounts::CreatePost {
            config: *config_pda,
            user: creator.pubkey(),
            payer: payer.pubkey(),
            user_account: user_account_pda,
            post: post_pda,
            system_program: system_program::ID,
        })
        .args(opinions_market_engine::instruction::CreatePost {
            post_id_hash: hash,
            parent_post_pda,
        })
        .instructions()
        .unwrap();

    // Both payer and creator (user) must sign
    let create_post_tx = send_tx(&rpc, create_post_ix, &payer.pubkey(), &[&payer, &creator])
        .await
        .unwrap();
    println!("create post tx: {:?}", create_post_tx);

    // Verify post was created
    let post_account = opinions_market_engine
        .account::<opinions_market_engine::state::PostAccount>(post_pda)
        .await
        .unwrap();
    assert_eq!(post_account.creator_user, creator.pubkey());
    assert_eq!(post_account.post_id_hash, hash);
    // Check state using pattern matching since PostState doesn't implement Debug
    match post_account.state {
        opinions_market_engine::state::PostState::Open => {}
        _ => panic!("Post should be in Open state"),
    }
    assert_eq!(post_account.upvotes, 0);
    assert_eq!(post_account.downvotes, 0);

    // Verify post type
    match (parent_post_pda, post_account.post_type) {
        (
            Some(parent),
            opinions_market_engine::state::PostType::Child {
                parent: stored_parent,
            },
        ) => {
            assert_eq!(stored_parent, parent);
        }
        (None, opinions_market_engine::state::PostType::Original) => {}
        _ => panic!("Post type mismatch"),
    }

    println!("✅ {} created successfully", post_type_str);
    post_pda
}

pub async fn test_phenomena_vote_on_post(
    rpc: &RpcClient,
    opinions_market_engine: &Program<&Keypair>,
    payer: &Keypair,
    voter: &Keypair,
    post_pda: &Pubkey,
    side: opinions_market_engine::state::Side,
    units: u32,
    token_mint: &Pubkey,
    token_atas: &HashMap<Pubkey, Pubkey>,
    config_pda: &Pubkey,
) {
    let side_str = match side {
        opinions_market_engine::state::Side::Pump => "upvote",
        opinions_market_engine::state::Side::Smack => "downvote",
    };
    println!(
        "{:} {}ing post {:} with {} units",
        voter.pubkey(),
        side_str,
        post_pda,
        units
    );

    // Get post account to get post_id_hash and find creator
    let post_account = opinions_market_engine
        .account::<opinions_market_engine::state::PostAccount>(*post_pda)
        .await
        .unwrap();

    let post_id_hash = post_account.post_id_hash;
    let creator_user = post_account.creator_user;

    let creator_user_account_pda = Pubkey::find_program_address(
        &[USER_ACCOUNT_SEED, creator_user.as_ref()],
        &opinions_market_engine.id(),
    )
    .0;
    // Get creator's wallet from user account
    let creator_user_account = opinions_market_engine
        .account::<opinions_market_engine::state::UserAccount>(creator_user_account_pda)
        .await
        .unwrap();

    // Get config
    let config = opinions_market_engine
        .account::<opinions_market_engine::state::Config>(*config_pda)
        .await
        .unwrap();

    let voter_user_account_pda = Pubkey::find_program_address(
        &[USER_ACCOUNT_SEED, voter.pubkey().as_ref()],
        &opinions_market_engine.id(),
    )
    .0;

    let position_pda = Pubkey::find_program_address(
        &[
            POSITION_SEED,
            post_pda.as_ref(),
            voter.pubkey().as_ref(), // Use voter's wallet pubkey, not user_account PDA
        ],
        &opinions_market_engine.id(),
    )
    .0;

    let vault_authority_pda =
        Pubkey::find_program_address(&[VAULT_AUTHORITY_SEED], &opinions_market_engine.id()).0;

    let user_vault_token_account_pda = Pubkey::find_program_address(
        &[
            USER_VAULT_TOKEN_ACCOUNT_SEED,
            voter.pubkey().as_ref(),
            token_mint.as_ref(),
        ],
        &opinions_market_engine.id(),
    )
    .0;

    let creator_vault_token_account_pda = Pubkey::find_program_address(
        &[
            USER_VAULT_TOKEN_ACCOUNT_SEED,
            creator_user.as_ref(),
            token_mint.as_ref(),
        ],
        &opinions_market_engine.id(),
    )
    .0;

    let post_pot_authority_pda = Pubkey::find_program_address(
        &[POST_POT_AUTHORITY_SEED, post_pda.as_ref()],
        &opinions_market_engine.id(),
    )
    .0;

    let post_pot_token_account_pda = Pubkey::find_program_address(
        &[
            POST_POT_TOKEN_ACCOUNT_SEED,
            post_pda.as_ref(),
            token_mint.as_ref(),
        ],
        &opinions_market_engine.id(),
    )
    .0;

    let protocol_treasury_token_account_pda = Pubkey::find_program_address(
        &[PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED, token_mint.as_ref()],
        &opinions_market_engine.id(),
    )
    .0;

    let valid_payment_pda = Pubkey::find_program_address(
        &[VALID_PAYMENT_SEED, token_mint.as_ref()],
        &opinions_market_engine.id(),
    )
    .0;

    let vote_ix = opinions_market_engine
        .request()
        .accounts(opinions_market_engine::accounts::VoteOnPost {
            config: *config_pda,
            user: voter.pubkey(),
            payer: payer.pubkey(),
            post: *post_pda,
            user_account: voter_user_account_pda,
            position: position_pda,
            vault_authority: vault_authority_pda,
            user_vault_token_account: user_vault_token_account_pda,
            post_pot_token_account: post_pot_token_account_pda,
            post_pot_authority: post_pot_authority_pda,
            protocol_token_treasury_token_account: protocol_treasury_token_account_pda,
            creator_vault_token_account: creator_vault_token_account_pda,
            valid_payment: valid_payment_pda,
            token_mint: *token_mint,
            token_program: spl_token::ID,
            system_program: system_program::ID,
        })
        .args(opinions_market_engine::instruction::VoteOnPost {
            side,
            units,
            post_id_hash,
        })
        .instructions()
        .unwrap();

    // Voter is the payer, so only voter needs to sign
    let vote_tx = send_tx(&rpc, vote_ix, &payer.pubkey(), &[&payer, &voter])
        .await
        .unwrap();
    println!("vote tx: {:?}", vote_tx);

    // Verify position was updated
    let position = opinions_market_engine
        .account::<opinions_market_engine::state::UserPostPosition>(position_pda)
        .await
        .unwrap();
    match side {
        opinions_market_engine::state::Side::Pump => {
            assert_eq!(position.upvotes, units);
        }
        opinions_market_engine::state::Side::Smack => {
            assert_eq!(position.downvotes, units);
        }
    }

    // Verify post counters were updated
    let updated_post = opinions_market_engine
        .account::<opinions_market_engine::state::PostAccount>(*post_pda)
        .await
        .unwrap();
    match side {
        opinions_market_engine::state::Side::Pump => {
            assert!(updated_post.upvotes >= units as u64);
        }
        opinions_market_engine::state::Side::Smack => {
            assert!(updated_post.downvotes >= units as u64);
        }
    }

    println!("✅ Vote successful. Position and post updated.");
}

pub async fn test_phenomena_settle_post(
    rpc: &RpcClient,
    opinions_market_engine: &Program<&Keypair>,
    payer: &Keypair,
    post_pda: &Pubkey,
    token_mint: &Pubkey,
    config_pda: &Pubkey,
) {
    println!("Settling post {:?}", post_pda);

    // Get post account to check if it's a child post
    let post_account = opinions_market_engine
        .account::<opinions_market_engine::state::PostAccount>(*post_pda)
        .await
        .unwrap();

    let post_pot_token_account_pda = Pubkey::find_program_address(
        &[
            POST_POT_TOKEN_ACCOUNT_SEED,
            post_pda.as_ref(),
            token_mint.as_ref(),
        ],
        &opinions_market_engine.id(),
    )
    .0;

    let post_pot_authority_pda = Pubkey::find_program_address(
        &[POST_POT_AUTHORITY_SEED, post_pda.as_ref()],
        &opinions_market_engine.id(),
    )
    .0;

    let post_mint_payout_pda = Pubkey::find_program_address(
        &[
            POST_MINT_PAYOUT_SEED,
            post_pda.as_ref(),
            token_mint.as_ref(),
        ],
        &opinions_market_engine.id(),
    )
    .0;

    let protocol_treasury_token_account_pda = Pubkey::find_program_address(
        &[PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED, token_mint.as_ref()],
        &opinions_market_engine.id(),
    )
    .0;

    // Handle parent post if this is a child post
    let parent_post_pda = match post_account.post_type {
        opinions_market_engine::state::PostType::Child { parent } => Some(parent),
        opinions_market_engine::state::PostType::Original => None,
    };

    let settle_ix = opinions_market_engine
        .request()
        .accounts(opinions_market_engine::accounts::SettlePost {
            post: *post_pda,
            post_pot_token_account: post_pot_token_account_pda,
            post_pot_authority: post_pot_authority_pda,
            post_mint_payout: post_mint_payout_pda,
            protocol_token_treasury_token_account: protocol_treasury_token_account_pda,
            parent_post: parent_post_pda,
            config: *config_pda,
            token_mint: *token_mint,
            payer: payer.pubkey(),
            token_program: spl_token::ID,
            system_program: system_program::ID,
        })
        .instructions()
        .unwrap();

    let settle_tx = send_tx(&rpc, settle_ix, &payer.pubkey(), &[&payer])
        .await
        .unwrap();
    println!("settle post tx: {:?}", settle_tx);

    // Verify post was settled
    let settled_post = opinions_market_engine
        .account::<opinions_market_engine::state::PostAccount>(*post_pda)
        .await
        .unwrap();

    match settled_post.state {
        opinions_market_engine::state::PostState::Settled => {}
        _ => panic!("Post should be in Settled state"),
    }

    // Verify post_mint_payout was created and has payout info
    let payout_account = opinions_market_engine
        .account::<opinions_market_engine::state::PostMintPayout>(post_mint_payout_pda)
        .await
        .unwrap();

    assert_eq!(payout_account.post, *post_pda);
    assert_eq!(payout_account.mint, *token_mint);

    // Check if payout was stored in the payout account
    if settled_post.upvotes > settled_post.downvotes
        || settled_post.downvotes > settled_post.upvotes
    {
        assert!(
            payout_account.payout_per_unit > 0,
            "Payout per unit should be > 0 for winning post"
        );
    }

    println!("✅ Post settled successfully");
}

// pub async fn test_phenomena_claim_post_reward() {}
