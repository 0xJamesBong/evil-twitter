use std::collections::HashMap;

use anchor_client::anchor_lang::require;
use anchor_client::anchor_lang::solana_program::example_mocks::solana_sdk::system_program;
use anchor_client::Program;
use anchor_spl::token::spl_token;
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::{signature::Keypair, signer::Signer};

use crate::config::TIME_CONFIG_FAST;
use crate::utils::rates::RATES;
use crate::utils::utils::{
    create_ed25519_instruction_for_session, current_chain_timestamp, send_tx,
    sign_message_for_session_registration, wait_for_post_to_expire, PRIVILEGES_HASH,
};
use opinions_market::pda_seeds::*;

pub async fn test_phenomena() {}

pub async fn test_phenomena_add_valid_payment(
    rpc: &RpcClient,
    opinions_market: &Program<&Keypair>,
    payer: &Keypair,
    admin: &Keypair,

    new_token_mint: &Pubkey,
) {
    println!("adding {:} as an valid payment mint", new_token_mint);
    let config_pda = Pubkey::find_program_address(&[b"config"], &opinions_market.id()).0;

    // adding usdc as an valid payment mint
    let valid_payment_pda = Pubkey::find_program_address(
        &[VALID_PAYMENT_SEED, new_token_mint.as_ref()],
        &opinions_market.id(),
    )
    .0;

    // BEFORE: Verify USDC is NOT an valid payment mint (account doesn't exist)
    let account_before = opinions_market
        .account::<opinions_market::states::ValidPayment>(valid_payment_pda)
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
        &opinions_market.id(),
    )
    .0;
    let register_valid_payment_ix = opinions_market
        .request()
        .accounts(opinions_market::accounts::RegisterValidPayment {
            config: config_pda,
            admin: admin.pubkey(),
            token_mint: new_token_mint.clone(),
            valid_payment: valid_payment_pda,
            protocol_token_treasury_token_account: treasury_token_account_pda,
            system_program: system_program::ID,
            token_program: spl_token::ID,
        })
        .args(opinions_market::instruction::RegisterValidPayment {
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
    let account_after = opinions_market
        .account::<opinions_market::states::ValidPayment>(valid_payment_pda)
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
    opinions_market: &Program<&Keypair>,
    payer: &Keypair,
    user: &Keypair,
    session_key: &Keypair,
    config_pda: &Pubkey,
) {
    println!("creating user {:}", user.pubkey());
    let user_account_pda = Pubkey::find_program_address(
        &[USER_ACCOUNT_SEED, user.pubkey().as_ref()],
        &opinions_market.id(),
    )
    .0;

    let create_user_ix = opinions_market
        .request()
        .accounts(opinions_market::accounts::CreateUser {
            user: user.pubkey(),
            payer: payer.pubkey(),
            user_account: user_account_pda,
            config: *config_pda,

            system_program: system_program::ID,
        })
        .args(opinions_market::instruction::CreateUser {})
        .instructions()
        .unwrap();

    let create_user_tx = send_tx(&rpc, create_user_ix, &payer.pubkey(), &[&payer])
        .await
        .unwrap();
    println!("create user tx: {:?}", create_user_tx);

    // Verify user account was created
    let user_account = opinions_market
        .account::<opinions_market::states::UserAccount>(user_account_pda)
        .await
        .unwrap();

    assert_eq!(
        user_account.user,
        user.pubkey(),
        "User account should store the wallet pubkey"
    );

    println!("✅ User account created successfully");

    // regisaer session
    // let now = Clock::get().unwrap().unix_timestamp;
    // user signs (for verification purposes, though ed25519_ix will re-sign)
    let _signature_bytes = sign_message_for_session_registration(user, &session_key.pubkey());
    // --------------------------
    // ED25519 VERIFY IX
    // --------------------------
    let ed25519_ix = create_ed25519_instruction_for_session(user, &session_key.pubkey());

    // Derive session authority PDA
    let (session_authority_pda, _) = Pubkey::find_program_address(
        &[
            SESSION_AUTHORITY_SEED,
            user.pubkey().as_ref(),
            session_key.pubkey().as_ref(),
        ],
        &opinions_market.id(),
    );

    // Instructions sysvar ID
    let instructions_sysvar = solana_sdk::sysvar::instructions::ID;

    let register_session_ix = opinions_market
        .request()
        .accounts(opinions_market::accounts::RegisterSession {
            payer: payer.pubkey(),
            user: user.pubkey(),
            session_key: session_key.pubkey(),
            session_authority: session_authority_pda,
            instructions_sysvar,
            system_program: system_program::ID,
        })
        .args(opinions_market::instruction::RegisterSession { expected_index: 0 })
        .instructions()
        .unwrap();

    // Build Vec<Instruction> with ed25519 first, then register_session
    let mut ed25519_and_register_session_ix = vec![ed25519_ix];
    ed25519_and_register_session_ix.extend(register_session_ix);

    let ed25519_and_register_session_tx = send_tx(
        &rpc,
        ed25519_and_register_session_ix,
        &payer.pubkey(),
        &[&payer],
    )
    .await
    .unwrap();
    println!("register session tx: {:?}", ed25519_and_register_session_tx);

    // verify session was registered
    let session_authority = opinions_market
        .account::<opinions_market::states::SessionAuthority>(session_authority_pda)
        .await
        .unwrap();

    assert_eq!(session_authority.user, user.pubkey());
    assert_eq!(session_authority.session_key, session_key.pubkey());
}

pub async fn test_phenomena_deposit(
    rpc: &RpcClient,
    opinions_market: &Program<&Keypair>,
    payer: &Keypair,
    user: &Keypair,
    amount: u64,
    token_mint: &Pubkey,
    tokens: &HashMap<Pubkey, String>,
    token_atas: &HashMap<Pubkey, Pubkey>,
    _config_pda: &Pubkey,
) {
    let token_name = tokens.get(token_mint).unwrap();
    println!("depositing {:} {:} to their vault", amount, token_name);

    let user_account_pda = Pubkey::find_program_address(
        &[USER_ACCOUNT_SEED, user.pubkey().as_ref()],
        &opinions_market.id(),
    )
    .0;

    let vault_authority_pda =
        Pubkey::find_program_address(&[VAULT_AUTHORITY_SEED], &opinions_market.id()).0;

    let vault_token_account_pda = Pubkey::find_program_address(
        &[
            USER_VAULT_TOKEN_ACCOUNT_SEED,
            user.pubkey().as_ref(),
            token_mint.as_ref(),
        ],
        &opinions_market.id(),
    )
    .0;

    let valid_payment_pda = Pubkey::find_program_address(
        &[VALID_PAYMENT_SEED, token_mint.as_ref()],
        &opinions_market.id(),
    )
    .0;

    let user_bling_ata = token_atas.get(&user.pubkey()).unwrap();

    // For BLING deposits, accepted_valid_payment can be a dummy account
    // (the function will skip validation for BLING)
    let deposit_ix = opinions_market
        .request()
        .accounts(opinions_market::accounts::Deposit {
            user: user.pubkey(),
            payer: payer.pubkey(),
            user_account: user_account_pda,
            token_mint: token_mint.clone(),
            valid_payment: valid_payment_pda,
            user_token_ata: *user_bling_ata,
            vault_authority: vault_authority_pda,
            user_vault_token_account: vault_token_account_pda,
            token_program: spl_token::ID,
            system_program: system_program::ID,
        })
        .args(opinions_market::instruction::Deposit { amount: amount })
        .instructions()
        .unwrap();

    let deposit_tx = send_tx(&rpc, deposit_ix, &payer.pubkey(), &[&payer, &user])
        .await
        .unwrap();
    println!("deposit tx: {:?}", deposit_tx);

    // Verify vault balance
    let vault_balance = opinions_market
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
    opinions_market: &Program<&Keypair>,
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
        &opinions_market.id(),
    )
    .0;

    let vault_authority_pda =
        Pubkey::find_program_address(&[VAULT_AUTHORITY_SEED], &opinions_market.id()).0;

    let vault_token_account_pda = Pubkey::find_program_address(
        &[
            USER_VAULT_TOKEN_ACCOUNT_SEED,
            user.pubkey().as_ref(),
            token_mint.as_ref(),
        ],
        &opinions_market.id(),
    )
    .0;

    let vault_balance_original = opinions_market
        .account::<anchor_spl::token::TokenAccount>(vault_token_account_pda)
        .await
        .unwrap()
        .amount;

    let user_token_ata = token_atas.get(&user.pubkey()).unwrap();

    let withdraw_ix = opinions_market
        .request()
        .accounts(opinions_market::accounts::Withdraw {
            user: user.pubkey(),
            payer: payer.pubkey(),
            user_account: user_account_pda,
            token_mint: token_mint.clone(),
            user_token_dest_ata: *user_token_ata,
            user_vault_token_account: vault_token_account_pda,
            vault_authority: vault_authority_pda,
            token_program: spl_token::ID,
        })
        .args(opinions_market::instruction::Withdraw { amount })
        .instructions()
        .unwrap();

    let withdraw_tx = send_tx(&rpc, withdraw_ix, &payer.pubkey(), &[&payer, &user])
        .await
        .unwrap();
    println!("withdraw tx: {:?}", withdraw_tx);

    // Verify vault balance decreased
    let vault_balance = opinions_market
        .account::<anchor_spl::token::TokenAccount>(vault_token_account_pda)
        .await
        .unwrap();
    assert_eq!(vault_balance.amount, vault_balance_original - amount);
    println!(
        "✅ Withdraw successful. Vault balance: {}",
        vault_balance.amount
    );

    // Verify user wallet balance increased
    let user_balance = opinions_market
        .account::<anchor_spl::token::TokenAccount>(*user_token_ata)
        .await
        .unwrap();
    println!("✅ User wallet balance: {}", user_balance.amount);
}

pub async fn test_phenomena_create_post(
    rpc: &RpcClient,
    opinions_market: &Program<&Keypair>,
    payer: &Keypair,
    creator: &Keypair,
    session_key: &Keypair,
    config_pda: &Pubkey,

    parent_post_pda: Option<Pubkey>,
) -> (Pubkey, [u8; 32]) {
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
        &opinions_market.id(),
    )
    .0;

    let post_pda =
        Pubkey::find_program_address(&[POST_ACCOUNT_SEED, hash.as_ref()], &opinions_market.id()).0;
    let session_authority_pda = Pubkey::find_program_address(
        &[
            SESSION_AUTHORITY_SEED,
            creator.pubkey().as_ref(),
            session_key.pubkey().as_ref(),
        ],
        &opinions_market.id(),
    )
    .0;
    let create_post_ix = opinions_market
        .request()
        .accounts(opinions_market::accounts::CreatePost {
            config: *config_pda,
            user: creator.pubkey(),
            payer: payer.pubkey(),
            session_key: session_key.pubkey(),
            session_authority: session_authority_pda,
            user_account: user_account_pda,
            post: post_pda,
            system_program: system_program::ID,
        })
        .args(opinions_market::instruction::CreatePost {
            post_id_hash: hash,
            parent_post_pda,
        })
        .instructions()
        .unwrap();

    // Both payer and creator (user) must sign
    let create_post_tx = send_tx(&rpc, create_post_ix, &payer.pubkey(), &[&payer])
        .await
        .unwrap();
    println!("create post tx: {:?}", create_post_tx);

    // Verify post was created and all fields are correct
    let post_account = opinions_market
        .account::<opinions_market::states::PostAccount>(post_pda)
        .await
        .unwrap();

    // Verify creator
    assert_eq!(
        post_account.creator_user,
        creator.pubkey(),
        "Post creator_user should match creator wallet"
    );

    // Verify post_id_hash
    assert_eq!(
        post_account.post_id_hash, hash,
        "Post post_id_hash should match generated hash"
    );

    // Verify state is Open
    assert_eq!(post_account.state, opinions_market::states::PostState::Open);
    println!("✅ Post state is Open");

    // Verify initial vote counts
    assert_eq!(post_account.upvotes, 0, "New post should have 0 upvotes");
    assert_eq!(
        post_account.downvotes, 0,
        "New post should have 0 downvotes"
    );

    // Verify winning_side is None for new post
    assert_eq!(
        post_account.winning_side, None,
        "New post should not have a winning_side"
    );
    println!("✅ Post winning_side is None (correct for new post)");

    // Verify timestamps are set correctly
    // start_time should be a valid timestamp (greater than 0 and reasonable)
    assert!(
        post_account.start_time > 0,
        "Post start_time should be set to a valid timestamp"
    );

    // Verify end_time is start_time + base_duration_secs
    let expected_end_time = post_account.start_time + (TIME_CONFIG_FAST.base_duration_secs) as i64;
    assert_eq!(
        post_account.end_time, expected_end_time,
        "Post end_time should be start_time + {} seconds (base_duration_secs)",
        TIME_CONFIG_FAST.base_duration_secs
    );

    // Verify end_time is after start_time
    assert!(
        post_account.end_time > post_account.start_time,
        "Post end_time should be after start_time"
    );

    // Verify post relation and function
    match parent_post_pda {
        Some(parent) => {
            // Child posts should be Normal function with Reply relation
            assert_eq!(
                post_account.function,
                opinions_market::states::PostFunction::Normal,
                "Child post should have Normal function"
            );
            if let opinions_market::states::PostRelation::Reply {
                parent: stored_parent,
            } = &post_account.relation
            {
                assert_eq!(
                    *stored_parent, parent,
                    "Child post parent PDA should match provided parent"
                );
                println!("✅ Post relation is Reply with correct parent");
            } else {
                panic!(
                    "Post relation mismatch: expected Reply but got {:?}",
                    post_account.relation
                );
            }
        }
        None => {
            // Root posts should be Normal function with Root relation
            assert_eq!(
                post_account.function,
                opinions_market::states::PostFunction::Normal,
                "Root post should have Normal function"
            );
            assert_eq!(
                post_account.relation,
                opinions_market::states::PostRelation::Root,
                "Post relation should be Root when no parent is provided"
            );
            println!("✅ Post relation is Root");
        }
    }

    println!(
        "✅ {} created successfully with all fields verified",
        post_type_str
    );
    println!("   - Creator: {}", post_account.creator_user);
    println!("   - State: Open");
    println!("   - Start time: {}", post_account.start_time);
    println!("   - End time: {}", post_account.end_time);
    println!(
        "   - Upvotes: {}, Downvotes: {}",
        post_account.upvotes, post_account.downvotes
    );
    println!("post_pda: {}", post_pda);
    println!("post_id_hash: {:?}", hex::encode(hash));

    (post_pda, hash)
}

pub async fn test_phenomena_create_question(
    rpc: &RpcClient,
    opinions_market: &Program<&Keypair>,
    payer: &Keypair,
    creator: &Keypair,
    session_key: &Keypair,
    config_pda: &Pubkey,
) -> (Pubkey, [u8; 32]) {
    println!("{:} creates a question", creator.pubkey());

    // Generate a unique post_id_hash
    let hash = crate::utils::utils::generate_post_id_hash();

    let user_account_pda = Pubkey::find_program_address(
        &[USER_ACCOUNT_SEED, creator.pubkey().as_ref()],
        &opinions_market.id(),
    )
    .0;

    let post_pda =
        Pubkey::find_program_address(&[POST_ACCOUNT_SEED, hash.as_ref()], &opinions_market.id()).0;
    let session_authority_pda = Pubkey::find_program_address(
        &[
            SESSION_AUTHORITY_SEED,
            creator.pubkey().as_ref(),
            session_key.pubkey().as_ref(),
        ],
        &opinions_market.id(),
    )
    .0;

    let create_question_ix = opinions_market
        .request()
        .accounts(opinions_market::accounts::CreatePost {
            config: *config_pda,
            user: creator.pubkey(),
            payer: payer.pubkey(),
            session_key: session_key.pubkey(),
            session_authority: session_authority_pda,
            user_account: user_account_pda,
            post: post_pda,
            system_program: system_program::ID,
        })
        .args(opinions_market::instruction::CreateQuestion { post_id_hash: hash })
        .instructions()
        .unwrap();

    // Both payer and creator (user) must sign
    let create_question_tx = send_tx(&rpc, create_question_ix, &payer.pubkey(), &[&payer])
        .await
        .unwrap();
    println!("create question tx: {:?}", create_question_tx);

    // Verify question was created and all fields are correct
    let post_account = opinions_market
        .account::<opinions_market::states::PostAccount>(post_pda)
        .await
        .unwrap();

    // Verify creator
    assert_eq!(
        post_account.creator_user,
        creator.pubkey(),
        "Question creator_user should match creator wallet"
    );

    // Verify post_id_hash
    assert_eq!(
        post_account.post_id_hash, hash,
        "Question post_id_hash should match generated hash"
    );

    // Verify state is Open
    assert_eq!(post_account.state, opinions_market::states::PostState::Open);
    println!("✅ Question state is Open");

    // Verify initial vote counts
    assert_eq!(
        post_account.upvotes, 0,
        "New question should have 0 upvotes"
    );
    assert_eq!(
        post_account.downvotes, 0,
        "New question should have 0 downvotes"
    );

    // Verify winning_side is None for new question
    assert_eq!(
        post_account.winning_side, None,
        "New question should not have a winning_side"
    );
    println!("✅ Question winning_side is None (correct for new question)");

    // Verify timestamps are set correctly
    assert!(
        post_account.start_time > 0,
        "Question start_time should be set to a valid timestamp"
    );

    let expected_end_time = post_account.start_time + (TIME_CONFIG_FAST.base_duration_secs) as i64;
    assert_eq!(
        post_account.end_time, expected_end_time,
        "Question end_time should be start_time + {} seconds (base_duration_secs)",
        TIME_CONFIG_FAST.base_duration_secs
    );

    assert!(
        post_account.end_time > post_account.start_time,
        "Question end_time should be after start_time"
    );

    // Verify question function and relation
    assert_eq!(
        post_account.function,
        opinions_market::states::PostFunction::Question,
        "Post should have Question function"
    );
    assert_eq!(
        post_account.relation,
        opinions_market::states::PostRelation::Root,
        "Question relation should be Root"
    );
    println!("✅ Question function and relation verified");

    // Verify forced_outcome is None
    assert_eq!(
        post_account.forced_outcome, None,
        "New question should not have a forced_outcome"
    );

    println!("✅ Question created successfully with all fields verified");
    println!("   - Creator: {}", post_account.creator_user);
    println!("   - Function: Question");
    println!("   - Relation: Root");
    println!("   - State: Open");
    println!("   - Start time: {}", post_account.start_time);
    println!("   - End time: {}", post_account.end_time);
    println!(
        "   - Upvotes: {}, Downvotes: {}",
        post_account.upvotes, post_account.downvotes
    );
    println!("question_pda: {}", post_pda);
    println!("question_id_hash: {:?}", hex::encode(hash));

    (post_pda, hash)
}

pub async fn test_phenomena_create_answer(
    rpc: &RpcClient,
    opinions_market: &Program<&Keypair>,
    payer: &Keypair,
    creator: &Keypair,
    session_key: &Keypair,
    config_pda: &Pubkey,
    question_post_pda: Pubkey,
    question_post_id_hash: [u8; 32],
) -> (Pubkey, [u8; 32]) {
    println!(
        "{:} creates an answer to question {:}",
        creator.pubkey(),
        question_post_pda
    );

    // Generate a unique post_id_hash for the answer
    let answer_hash = crate::utils::utils::generate_post_id_hash();

    let user_account_pda = Pubkey::find_program_address(
        &[USER_ACCOUNT_SEED, creator.pubkey().as_ref()],
        &opinions_market.id(),
    )
    .0;

    let answer_pda = Pubkey::find_program_address(
        &[POST_ACCOUNT_SEED, answer_hash.as_ref()],
        &opinions_market.id(),
    )
    .0;
    let session_authority_pda = Pubkey::find_program_address(
        &[
            SESSION_AUTHORITY_SEED,
            creator.pubkey().as_ref(),
            session_key.pubkey().as_ref(),
        ],
        &opinions_market.id(),
    )
    .0;

    let create_answer_ix = opinions_market
        .request()
        .accounts(opinions_market::accounts::CreateAnswer {
            config: *config_pda,
            user: creator.pubkey(),
            payer: payer.pubkey(),
            session_key: session_key.pubkey(),
            session_authority: session_authority_pda,
            user_account: user_account_pda,
            post: answer_pda,
            question_post: question_post_pda,
            system_program: system_program::ID,
        })
        .args(opinions_market::instruction::CreateAnswer {
            answer_post_id_hash: answer_hash,
            _question_post_id_hash: question_post_id_hash,
        })
        .instructions()
        .unwrap();

    // Both payer and creator (user) must sign
    let create_answer_tx = send_tx(&rpc, create_answer_ix, &payer.pubkey(), &[&payer])
        .await
        .unwrap();
    println!("create answer tx: {:?}", create_answer_tx);

    // Verify answer was created and all fields are correct
    let post_account = opinions_market
        .account::<opinions_market::states::PostAccount>(answer_pda)
        .await
        .unwrap();

    // Verify creator
    assert_eq!(
        post_account.creator_user,
        creator.pubkey(),
        "Answer creator_user should match creator wallet"
    );

    // Verify post_id_hash
    assert_eq!(
        post_account.post_id_hash, answer_hash,
        "Answer post_id_hash should match generated hash"
    );

    // Verify state is Open
    assert_eq!(post_account.state, opinions_market::states::PostState::Open);
    println!("✅ Answer state is Open");

    // Verify initial vote counts
    assert_eq!(post_account.upvotes, 0, "New answer should have 0 upvotes");
    assert_eq!(
        post_account.downvotes, 0,
        "New answer should have 0 downvotes"
    );

    // Verify winning_side is None for new answer
    assert_eq!(
        post_account.winning_side, None,
        "New answer should not have a winning_side"
    );
    println!("✅ Answer winning_side is None (correct for new answer)");

    // Verify timestamps are set correctly
    assert!(
        post_account.start_time > 0,
        "Answer start_time should be set to a valid timestamp"
    );

    let expected_end_time = post_account.start_time + (TIME_CONFIG_FAST.base_duration_secs) as i64;
    assert_eq!(
        post_account.end_time, expected_end_time,
        "Answer end_time should be start_time + {} seconds (base_duration_secs)",
        TIME_CONFIG_FAST.base_duration_secs
    );

    assert!(
        post_account.end_time > post_account.start_time,
        "Answer end_time should be after start_time"
    );

    // Verify answer function and relation
    assert_eq!(
        post_account.function,
        opinions_market::states::PostFunction::Answer,
        "Post should have Answer function"
    );
    if let opinions_market::states::PostRelation::AnswerTo {
        question: stored_question,
    } = &post_account.relation
    {
        assert_eq!(
            *stored_question, question_post_pda,
            "Answer question PDA should match provided question"
        );
        println!("✅ Answer relation is AnswerTo with correct question");
    } else {
        panic!(
            "Answer relation mismatch: expected AnswerTo but got {:?}",
            post_account.relation
        );
    }

    // Verify forced_outcome is None (may be set later by question owner)
    assert_eq!(
        post_account.forced_outcome, None,
        "New answer should not have a forced_outcome"
    );

    println!("✅ Answer created successfully with all fields verified");
    println!("   - Creator: {}", post_account.creator_user);
    println!("   - Function: Answer");
    println!("   - Relation: AnswerTo({})", question_post_pda);
    println!("   - State: Open");
    println!("   - Start time: {}", post_account.start_time);
    println!("   - End time: {}", post_account.end_time);
    println!(
        "   - Upvotes: {}, Downvotes: {}",
        post_account.upvotes, post_account.downvotes
    );
    println!("answer_pda: {}", answer_pda);
    println!("answer_id_hash: {:?}", hex::encode(answer_hash));

    (answer_pda, answer_hash)
}

pub async fn test_phenomena_vote_on_post(
    rpc: &RpcClient,
    opinions_market: &Program<&Keypair>,
    payer: &Keypair,
    voter: &Keypair,
    session_key: &Keypair,
    post_pda: &Pubkey,
    side: opinions_market::states::Side,
    votes: u64,
    token_mint: &Pubkey,
    token_atas: &HashMap<Pubkey, Pubkey>,
    config_pda: &Pubkey,
) {
    let side_str = match side {
        opinions_market::states::Side::Pump => "upvote",
        opinions_market::states::Side::Smack => "downvote",
    };
    println!(
        "{:} {}ing post {:} with {} votes",
        voter.pubkey(),
        side_str,
        post_pda,
        votes
    );

    // Get post account BEFORE vote to capture initial state
    let post_account_before = opinions_market
        .account::<opinions_market::states::PostAccount>(*post_pda)
        .await
        .unwrap();

    let post_id_hash = post_account_before.post_id_hash.clone();

    println!("post_pda passed in: {}", post_pda);
    let expected = Pubkey::find_program_address(
        &[POST_ACCOUNT_SEED, post_id_hash.as_ref()],
        &opinions_market.id(),
    )
    .0;
    println!("post_pda derived from seeds: {}", expected);
    println!("post_id_hash: {}", hex::encode(post_id_hash));

    assert_eq!(
        post_account_before.state,
        opinions_market::states::PostState::Open,
        "Post should be in Open state before voting"
    );
    println!("✅ Post state is Open");

    // Capture initial post state
    let initial_end_time = post_account_before.end_time;
    let initial_upvotes = post_account_before.upvotes;
    let initial_downvotes = post_account_before.downvotes;
    let initial_start_time = post_account_before.start_time;

    println!("📊 Post state BEFORE vote:");
    println!("   - Start time: {}", initial_start_time);
    println!("   - End time: {}", initial_end_time);
    println!(
        "   - Upvotes: {}, Downvotes: {}",
        initial_upvotes, initial_downvotes
    );

    // Use TIME_CONFIG_FAST for time calculations (matches what we initialized with)
    // Calculate expected end_time extension
    let expected_extension = (TIME_CONFIG_FAST.extension_per_vote_secs as i64) * (votes as i64);
    let naive_new_end_time = initial_end_time + expected_extension;
    let max_allowed_end_time = initial_start_time + (TIME_CONFIG_FAST.max_duration_secs as i64);
    let expected_end_time = naive_new_end_time.min(max_allowed_end_time);
    let expected_actual_extension = expected_end_time - initial_end_time;

    println!(
        "📅 Expected time extension: {} seconds ({} votes × {} secs/vote)",
        expected_extension, votes, TIME_CONFIG_FAST.extension_per_vote_secs
    );
    println!("   - Naive new end_time: {}", naive_new_end_time);
    println!("   - Max allowed end_time: {}", max_allowed_end_time);
    println!(
        "   - Expected end_time after vote: {} (extension: {} seconds)",
        expected_end_time, expected_actual_extension
    );

    let voter_user_account_pda = Pubkey::find_program_address(
        &[USER_ACCOUNT_SEED, voter.pubkey().as_ref()],
        &opinions_market.id(),
    )
    .0;

    let user_vault_token_account_pda = Pubkey::find_program_address(
        &[
            USER_VAULT_TOKEN_ACCOUNT_SEED,
            voter.pubkey().as_ref(),
            token_mint.as_ref(),
        ],
        &opinions_market.id(),
    )
    .0;

    let position_pda = Pubkey::find_program_address(
        &[
            POSITION_SEED,
            post_pda.as_ref(),
            voter.pubkey().as_ref(), // Use voter's wallet pubkey, not user_account PDA
        ],
        &opinions_market.id(),
    )
    .0;

    // Try to get position BEFORE vote (may not exist)
    let position_before = opinions_market
        .account::<opinions_market::states::UserPostPosition>(position_pda)
        .await;

    let initial_position_upvotes = match &position_before {
        Ok(pos) => pos.upvotes,
        Err(_) => 0,
    };
    let initial_position_downvotes = match &position_before {
        Ok(pos) => pos.downvotes,
        Err(_) => 0,
    };

    println!("📊 Position state BEFORE vote:");
    println!(
        "   - Upvotes: {}, Downvotes: {}",
        initial_position_upvotes, initial_position_downvotes
    );

    let vault_authority_pda =
        Pubkey::find_program_address(&[VAULT_AUTHORITY_SEED], &opinions_market.id()).0;

    let creator_user = post_account_before.creator_user; // this is a wallet pubkey

    let creator_vault_token_account_pda = Pubkey::find_program_address(
        &[
            USER_VAULT_TOKEN_ACCOUNT_SEED,
            creator_user.as_ref(),
            token_mint.as_ref(),
        ],
        &opinions_market.id(),
    )
    .0;

    let post_pot_authority_pda = Pubkey::find_program_address(
        &[POST_POT_AUTHORITY_SEED, post_pda.as_ref()],
        &opinions_market.id(),
    )
    .0;

    let post_pot_token_account_pda = Pubkey::find_program_address(
        &[
            POST_POT_TOKEN_ACCOUNT_SEED,
            post_pda.as_ref(),
            token_mint.as_ref(),
        ],
        &opinions_market.id(),
    )
    .0;

    let protocol_treasury_token_account_pda = Pubkey::find_program_address(
        &[PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED, token_mint.as_ref()],
        &opinions_market.id(),
    )
    .0;

    let valid_payment_pda = Pubkey::find_program_address(
        &[VALID_PAYMENT_SEED, token_mint.as_ref()],
        &opinions_market.id(),
    )
    .0;

    let session_authority_pda = Pubkey::find_program_address(
        &[
            SESSION_AUTHORITY_SEED,
            voter.pubkey().as_ref(),
            session_key.pubkey().as_ref(),
        ],
        &opinions_market.id(),
    )
    .0;

    let vote_ix = opinions_market
        .request()
        .accounts(opinions_market::accounts::VoteOnPost {
            config: *config_pda,
            voter: voter.pubkey(),
            payer: payer.pubkey(),
            session_key: session_key.pubkey(),
            session_authority: session_authority_pda,
            post: *post_pda,
            voter_user_account: voter_user_account_pda,
            position: position_pda,
            vault_authority: vault_authority_pda,
            voter_user_vault_token_account: user_vault_token_account_pda,
            post_pot_token_account: post_pot_token_account_pda,
            post_pot_authority: post_pot_authority_pda,
            protocol_token_treasury_token_account: protocol_treasury_token_account_pda,
            creator_vault_token_account: creator_vault_token_account_pda,
            valid_payment: valid_payment_pda,
            token_mint: *token_mint,
            token_program: spl_token::ID,
            system_program: system_program::ID,
        })
        .args(opinions_market::instruction::VoteOnPost {
            side,
            votes,
            post_id_hash,
        })
        .instructions()
        .unwrap();

    // Voter is the payer, so only voter needs to sign
    let vote_tx = send_tx(&rpc, vote_ix, &payer.pubkey(), &[&payer])
        .await
        .unwrap();
    println!("vote tx: {:?}", vote_tx);

    // Verify position was updated AFTER vote
    let position_after = opinions_market
        .account::<opinions_market::states::UserPostPosition>(position_pda)
        .await
        .unwrap();

    println!("📊 Position state AFTER vote:");
    println!(
        "   - Upvotes: {}, Downvotes: {}",
        position_after.upvotes, position_after.downvotes
    );

    match side {
        opinions_market::states::Side::Pump => {
            assert_eq!(
                position_after.upvotes,
                initial_position_upvotes + votes,
                "Position upvotes should increase by {} (was {}, now {})",
                votes,
                initial_position_upvotes,
                position_after.upvotes
            );
        }
        opinions_market::states::Side::Smack => {
            assert_eq!(
                position_after.downvotes,
                initial_position_downvotes + votes,
                "Position downvotes should increase by {} (was {}, now {})",
                votes,
                initial_position_downvotes,
                position_after.downvotes
            );
        }
    }

    // Verify post counters were updated AFTER vote
    let post_account_after = opinions_market
        .account::<opinions_market::states::PostAccount>(*post_pda)
        .await
        .unwrap();

    println!("📊 Post state AFTER vote:");
    println!(
        "   - Start time: {} (unchanged)",
        post_account_after.start_time
    );
    println!(
        "   - End time: {} (was {}, changed by {} seconds)",
        post_account_after.end_time,
        initial_end_time,
        post_account_after.end_time - initial_end_time
    );
    println!(
        "   - Upvotes: {} (was {}, changed by {})",
        post_account_after.upvotes,
        initial_upvotes,
        post_account_after.upvotes as i64 - initial_upvotes as i64
    );
    println!(
        "   - Downvotes: {} (was {}, changed by {})",
        post_account_after.downvotes,
        initial_downvotes,
        post_account_after.downvotes as i64 - initial_downvotes as i64
    );

    // Verify start_time didn't change
    assert_eq!(
        post_account_after.start_time, initial_start_time,
        "Post start_time should not change after vote"
    );

    // Verify end_time was extended correctly
    let actual_extension = post_account_after.end_time - initial_end_time;
    assert_eq!(
        post_account_after.end_time, expected_end_time,
        "Post end_time should be extended correctly. Expected: {} (extension: {} secs), Got: {} (extension: {} secs)",
        expected_end_time, expected_actual_extension, post_account_after.end_time, actual_extension
    );
    assert!(
        actual_extension > 0,
        "Post end_time should be extended by at least some amount. Extension: {} seconds",
        actual_extension
    );
    assert!(
        actual_extension <= expected_extension,
        "Post end_time extension should not exceed expected. Expected max: {} secs, Got: {} secs",
        expected_extension,
        actual_extension
    );

    // Verify vote counts increased correctly
    match side {
        opinions_market::states::Side::Pump => {
            assert!(
                post_account_after.upvotes >= initial_upvotes + votes as u64,
                "Post upvotes should increase by at least {} (was {}, now {})",
                votes,
                initial_upvotes,
                post_account_after.upvotes
            );
        }
        opinions_market::states::Side::Smack => {
            assert!(
                post_account_after.downvotes >= initial_downvotes + votes as u64,
                "Post downvotes should increase by at least {} (was {}, now {})",
                votes,
                initial_downvotes,
                post_account_after.downvotes
            );
        }
    }

    println!("✅ Vote successful. Position and post updated correctly.");
    println!("   ✅ End time extended by {} seconds", actual_extension);
}

pub async fn test_phenomena_settle_post(
    rpc: &RpcClient,
    opinions_market: &Program<&Keypair>,
    payer: &Keypair,
    post_pda: &Pubkey,
    tokens: &HashMap<Pubkey, String>,
    config_pda: &Pubkey,
) {
    println!("Settling post {:?} for {} tokens", post_pda, tokens.len());

    // wait for post to be expired
    wait_for_post_to_expire(rpc, opinions_market, post_pda).await;

    for (token_mint, token_name) in tokens {
        println!(
            "Settling post {:?} for token mint: {}",
            post_pda, token_name
        );

        // Get post account to check if it's a child post
        let post_account = opinions_market
            .account::<opinions_market::states::PostAccount>(*post_pda)
            .await
            .unwrap();
        let post_id_hash = post_account.post_id_hash.clone();

        let post_pot_token_account_pda = Pubkey::find_program_address(
            &[
                POST_POT_TOKEN_ACCOUNT_SEED,
                post_pda.as_ref(),
                token_mint.as_ref(),
            ],
            &opinions_market.id(),
        )
        .0;

        // Check if post_pot_token_account exists (only exists if someone voted with this token mint)
        let post_pot_result = opinions_market
            .account::<anchor_spl::token::TokenAccount>(post_pot_token_account_pda)
            .await;

        match post_pot_result {
            Ok(post_pot) if post_pot.amount == 0 => {
                println!(
                    "⚠️  Post pot for token {} is empty (0 balance), skipping settlement",
                    token_name
                );
                continue; // Skip this token mint - nothing to settle
            }
            Err(_) => {
                println!(
                    "⚠️  No votes for token {} on this post (account doesn't exist), skipping settlement",
                    token_name
                );
                continue; // Skip this token mint - account was never created
            }
            Ok(_) => {
                // Account exists and has balance, proceed with settlement
            }
        }

        let post_pot_authority_pda = Pubkey::find_program_address(
            &[POST_POT_AUTHORITY_SEED, post_pda.as_ref()],
            &opinions_market.id(),
        )
        .0;

        let post_mint_payout_pda = Pubkey::find_program_address(
            &[
                POST_MINT_PAYOUT_SEED,
                post_pda.as_ref(),
                token_mint.as_ref(),
            ],
            &opinions_market.id(),
        )
        .0;

        let protocol_treasury_token_account_pda = Pubkey::find_program_address(
            &[PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED, token_mint.as_ref()],
            &opinions_market.id(),
        )
        .0;

        // Handle parent post if this is a child post
        let parent_post_pda = match &post_account.relation {
            opinions_market::states::PostRelation::Reply { parent } => Some(*parent),
            opinions_market::states::PostRelation::Quote { quoted: parent } => Some(*parent),
            opinions_market::states::PostRelation::AnswerTo { question: parent } => Some(*parent),
            opinions_market::states::PostRelation::Root => None,
        };

        // Derive parent post pot accounts if this is a child post
        let (parent_post_pot_token_account_pda, parent_post_pot_authority_pda) =
            if let Some(parent_pda) = parent_post_pda {
                let parent_pot_token_account = Pubkey::find_program_address(
                    &[
                        POST_POT_TOKEN_ACCOUNT_SEED,
                        parent_pda.as_ref(),
                        token_mint.as_ref(),
                    ],
                    &opinions_market.id(),
                )
                .0;

                let parent_pot_authority = Pubkey::find_program_address(
                    &[POST_POT_AUTHORITY_SEED, parent_pda.as_ref()],
                    &opinions_market.id(),
                )
                .0;

                (Some(parent_pot_token_account), parent_pot_authority)
            } else {
                // Use post_pot_authority as fallback when there's no parent (struct requires non-optional)
                (None, post_pot_authority_pda)
            };

        let settle_ix = opinions_market
            .request()
            .accounts(opinions_market::accounts::SettlePost {
                post: *post_pda,
                post_pot_token_account: post_pot_token_account_pda,
                post_pot_authority: post_pot_authority_pda,
                post_mint_payout: post_mint_payout_pda,
                protocol_token_treasury_token_account: protocol_treasury_token_account_pda,
                parent_post: parent_post_pda,
                parent_post_pot_token_account: parent_post_pot_token_account_pda,
                parent_post_pot_authority: parent_post_pot_authority_pda,
                config: *config_pda,
                token_mint: *token_mint,
                payer: payer.pubkey(),
                token_program: spl_token::ID,
                system_program: system_program::ID,
            })
            .args(opinions_market::instruction::SettlePost {
                post_id_hash: post_id_hash,
            })
            .instructions()
            .unwrap();

        let settle_tx = send_tx(&rpc, settle_ix, &payer.pubkey(), &[&payer])
            .await
            .unwrap();
        println!("settle post tx: {:?}", settle_tx);

        // Verify post was settled
        let settled_post = opinions_market
            .account::<opinions_market::states::PostAccount>(*post_pda)
            .await
            .unwrap();

        assert_eq!(
            settled_post.state,
            opinions_market::states::PostState::Settled
        );
        println!("✅ Post state is Settled");

        // Verify post_mint_payout was created and has payout info
        let payout_account = opinions_market
            .account::<opinions_market::states::PostMintPayout>(post_mint_payout_pda)
            .await
            .unwrap();

        assert_eq!(payout_account.post, *post_pda);
        assert_eq!(payout_account.token_mint, *token_mint);
        assert!(
            payout_account.frozen,
            "Payout should be frozen after settlement"
        );

        // Check if payout was stored in the payout account
        if settled_post.upvotes > settled_post.downvotes
            || settled_post.downvotes > settled_post.upvotes
        {
            assert!(
                payout_account.payout_per_winning_vote > 0,
                "Payout per vote should be > 0 for winning post"
            );
        }

        let winning_side = match settled_post.winning_side.unwrap() {
            opinions_market::states::Side::Pump => "Pump",
            opinions_market::states::Side::Smack => "Smack",
        };
        println!("✅ Post settled successfully, {} won", winning_side);
        println!("  Creator fee: {}", payout_account.creator_fee);
        println!("  Protocol fee: {}", payout_account.protocol_fee);
        println!("  Mother fee: {}", payout_account.mother_fee);
        println!("  Total payout for voters: {}", payout_account.total_payout);

        // Now chain the distribution instructions
        let mut distribution_ixs = Vec::new();

        // 1. Distribute creator reward (if creator fee > 0)
        if payout_account.creator_fee > 0 {
            let vault_authority_pda =
                Pubkey::find_program_address(&[VAULT_AUTHORITY_SEED], &opinions_market.id()).0;

            let creator_vault_token_account_pda = Pubkey::find_program_address(
                &[
                    USER_VAULT_TOKEN_ACCOUNT_SEED,
                    settled_post.creator_user.as_ref(),
                    token_mint.as_ref(),
                ],
                &opinions_market.id(),
            )
            .0;

            let distribute_creator_ix = opinions_market
                .request()
                .accounts(opinions_market::accounts::DistributeCreatorReward {
                    payer: payer.pubkey(),
                    post: *post_pda,
                    post_pot_token_account: post_pot_token_account_pda,
                    post_pot_authority: post_pot_authority_pda,
                    post_mint_payout: post_mint_payout_pda,
                    creator_vault_token_account: creator_vault_token_account_pda,
                    vault_authority: vault_authority_pda,
                    token_mint: *token_mint,
                    token_program: spl_token::ID,
                })
                .args(opinions_market::instruction::DistributeCreatorReward {
                    post_id_hash: post_id_hash,
                })
                .instructions()
                .unwrap();

            distribution_ixs.push(distribute_creator_ix);
            println!("  Added distribute_creator_reward instruction");
        }

        // 2. Distribute protocol fee (if protocol fee > 0)
        if payout_account.protocol_fee > 0 {
            let distribute_protocol_ix = opinions_market
                .request()
                .accounts(opinions_market::accounts::DistributeProtocolFee {
                    payer: payer.pubkey(),
                    post: *post_pda,
                    post_pot_token_account: post_pot_token_account_pda,
                    post_pot_authority: post_pot_authority_pda,
                    post_mint_payout: post_mint_payout_pda,
                    protocol_token_treasury_token_account: protocol_treasury_token_account_pda,
                    config: *config_pda,
                    token_mint: *token_mint,
                    token_program: spl_token::ID,
                })
                .args(opinions_market::instruction::DistributeProtocolFee {
                    post_id_hash: post_id_hash,
                })
                .instructions()
                .unwrap();

            distribution_ixs.push(distribute_protocol_ix);
            println!("  Added distribute_protocol_fee instruction");
        }

        // 3. Distribute parent post share (if mother fee > 0 and it's a child post)
        if payout_account.mother_fee > 0 && parent_post_pda.is_some() {
            let parent_post_pda_unwrapped = parent_post_pda.unwrap();

            let parent_post_pot_token_account_pda = Pubkey::find_program_address(
                &[
                    POST_POT_TOKEN_ACCOUNT_SEED,
                    parent_post_pda_unwrapped.as_ref(),
                    token_mint.as_ref(),
                ],
                &opinions_market.id(),
            )
            .0;

            let parent_post_pot_authority_pda = Pubkey::find_program_address(
                &[POST_POT_AUTHORITY_SEED, parent_post_pda_unwrapped.as_ref()],
                &opinions_market.id(),
            )
            .0;

            let distribute_parent_ix = opinions_market
                .request()
                .accounts(opinions_market::accounts::DistributeParentPostShare {
                    payer: payer.pubkey(),
                    post: *post_pda,
                    post_pot_token_account: post_pot_token_account_pda,
                    post_pot_authority: post_pot_authority_pda,
                    post_mint_payout: post_mint_payout_pda,
                    parent_post: parent_post_pda,
                    parent_post_pot_token_account: Some(parent_post_pot_token_account_pda),
                    parent_post_pot_authority: Some(parent_post_pot_authority_pda),
                    token_mint: *token_mint,
                    token_program: spl_token::ID,
                })
                .args(opinions_market::instruction::DistributeParentPostShare {
                    post_id_hash: post_id_hash,
                })
                .instructions()
                .unwrap();

            distribution_ixs.push(distribute_parent_ix);
            println!("  Added distribute_parent_post_share instruction");
        }

        // Send all distribution instructions in one transaction
        if !distribution_ixs.is_empty() {
            // Combine all instructions into a single transaction
            let mut combined_ixs = Vec::new();
            for mut ix_vec in distribution_ixs {
                combined_ixs.append(&mut ix_vec);
            }

            let distribute_tx = send_tx(&rpc, combined_ixs, &payer.pubkey(), &[&payer])
                .await
                .unwrap();
            println!("✅ Distribution transactions sent: {:?}", distribute_tx);
            println!("✅ All fees distributed successfully");
        } else {
            println!("⚠️  No fees to distribute (all fees are 0)");
        }
    }
}

pub async fn test_phenomena_claim_post_reward(
    rpc: &RpcClient,
    opinions_market: &Program<&Keypair>,
    payer: &Keypair,
    user: &Keypair,
    session_key: &Keypair,
    post_pda: &Pubkey,
    token_mint: &Pubkey,
    tokens: &HashMap<Pubkey, String>,
    config_pda: &Pubkey,
) {
    let token_name = tokens.get(token_mint).unwrap();
    println!(
        "User {:?} claiming reward from post {:?} for token {}",
        user.pubkey(),
        post_pda,
        token_name
    );

    // Get post account to extract post_id_hash
    let post_account = opinions_market
        .account::<opinions_market::states::PostAccount>(*post_pda)
        .await
        .unwrap();
    let post_id_hash = post_account.post_id_hash.clone();

    // Verify post is settled
    assert_eq!(
        post_account.state,
        opinions_market::states::PostState::Settled,
        "Post must be settled before claiming rewards"
    );

    // Verify post has a winning side
    assert!(
        post_account.winning_side.is_some(),
        "Post must have a winning side to claim rewards"
    );

    // Derive all necessary PDAs
    let position_pda = Pubkey::find_program_address(
        &[POSITION_SEED, post_pda.as_ref(), user.pubkey().as_ref()],
        &opinions_market.id(),
    )
    .0;

    let user_post_mint_claim_pda = Pubkey::find_program_address(
        &[
            USER_POST_MINT_CLAIM_SEED,
            post_pda.as_ref(),
            token_mint.as_ref(),
        ],
        &opinions_market.id(),
    )
    .0;

    let post_mint_payout_pda = Pubkey::find_program_address(
        &[
            POST_MINT_PAYOUT_SEED,
            post_pda.as_ref(),
            token_mint.as_ref(),
        ],
        &opinions_market.id(),
    )
    .0;

    let post_pot_token_account_pda = Pubkey::find_program_address(
        &[
            POST_POT_TOKEN_ACCOUNT_SEED,
            post_pda.as_ref(),
            token_mint.as_ref(),
        ],
        &opinions_market.id(),
    )
    .0;

    let post_pot_authority_pda = Pubkey::find_program_address(
        &[POST_POT_AUTHORITY_SEED, post_pda.as_ref()],
        &opinions_market.id(),
    )
    .0;

    let user_vault_token_account_pda = Pubkey::find_program_address(
        &[
            USER_VAULT_TOKEN_ACCOUNT_SEED,
            user.pubkey().as_ref(),
            token_mint.as_ref(),
        ],
        &opinions_market.id(),
    )
    .0;

    let session_authority_pda = Pubkey::find_program_address(
        &[
            SESSION_AUTHORITY_SEED,
            user.pubkey().as_ref(),
            session_key.pubkey().as_ref(),
        ],
        &opinions_market.id(),
    )
    .0;

    // Get initial balances and state
    // Check if position exists (user must have voted on this post)
    let position_result = opinions_market
        .account::<opinions_market::states::UserPostPosition>(position_pda)
        .await;

    let position = match position_result {
        Ok(pos) => pos,
        Err(_) => {
            println!("⚠️  User has no position on this post (never voted), cannot claim reward");
            return; // User never voted, so no reward to claim
        }
    };

    let post_mint_payout = opinions_market
        .account::<opinions_market::states::PostMintPayout>(post_mint_payout_pda)
        .await
        .unwrap();

    let post_pot_before = opinions_market
        .account::<anchor_spl::token::TokenAccount>(post_pot_token_account_pda)
        .await
        .unwrap();

    let user_vault_before = opinions_market
        .account::<anchor_spl::token::TokenAccount>(user_vault_token_account_pda)
        .await
        .unwrap();

    // Check if already claimed
    let claim_before = opinions_market
        .account::<opinions_market::states::UserPostMintClaim>(user_post_mint_claim_pda)
        .await;

    if let Ok(claim) = claim_before {
        if claim.claimed {
            println!("⚠️  Reward already claimed for this token mint, skipping...");
            return;
        }
    }

    // Determine expected reward
    let winning_side = post_account.winning_side.unwrap();
    let user_votes = match winning_side {
        opinions_market::states::Side::Pump => position.upvotes as u64,
        opinions_market::states::Side::Smack => position.downvotes as u64,
    };

    let expected_reward = if user_votes == 0 {
        0
    } else {
        let scaled = user_votes
            .checked_mul(post_mint_payout.payout_per_winning_vote)
            .unwrap();
        scaled
            .checked_div(opinions_market::constants::PRECISION)
            .unwrap()
    };

    println!("📊 Claim details:");
    println!("   - Winning side: {:?}", winning_side);
    println!("   - User votes on winning side: {}", user_votes);
    println!(
        "   - Payout per winning vote: {}",
        post_mint_payout.payout_per_winning_vote
    );
    println!("   - Expected reward: {}", expected_reward);
    println!("   - Post pot before: {}", post_pot_before.amount);
    println!("   - User vault before: {}", user_vault_before.amount);

    // Call claim_post_reward instruction
    let claim_ix = opinions_market
        .request()
        .accounts(opinions_market::accounts::ClaimPostReward {
            config: *config_pda,
            user: user.pubkey(),
            payer: payer.pubkey(),
            session_key: session_key.pubkey(),
            session_authority: session_authority_pda,
            post: *post_pda,
            position: position_pda,
            user_post_mint_claim: user_post_mint_claim_pda,
            post_mint_payout: post_mint_payout_pda,
            post_pot_token_account: post_pot_token_account_pda,
            post_pot_authority: post_pot_authority_pda,
            user_vault_token_account: user_vault_token_account_pda,
            token_mint: *token_mint,
            token_program: spl_token::ID,
            system_program: system_program::ID,
        })
        .args(opinions_market::instruction::ClaimPostReward { post_id_hash })
        .instructions()
        .unwrap();

    let claim_tx = send_tx(&rpc, claim_ix, &payer.pubkey(), &[&payer])
        .await
        .unwrap();
    println!("claim post reward tx: {:?}", claim_tx);

    // Verify claim was successful
    let user_post_mint_claim = opinions_market
        .account::<opinions_market::states::UserPostMintClaim>(user_post_mint_claim_pda)
        .await
        .unwrap();

    assert_eq!(
        user_post_mint_claim.claimed, true,
        "Claim should be marked as claimed"
    );

    // Verify balances changed correctly
    let post_pot_after = opinions_market
        .account::<anchor_spl::token::TokenAccount>(post_pot_token_account_pda)
        .await
        .unwrap();

    let user_vault_after = opinions_market
        .account::<anchor_spl::token::TokenAccount>(user_vault_token_account_pda)
        .await
        .unwrap();

    if expected_reward > 0 {
        assert_eq!(
            post_pot_after.amount,
            post_pot_before.amount.checked_sub(expected_reward).unwrap(),
            "Post pot should decrease by reward amount"
        );
        assert_eq!(
            user_vault_after.amount,
            user_vault_before
                .amount
                .checked_add(expected_reward)
                .unwrap(),
            "User vault should increase by reward amount"
        );
        println!("✅ Reward transferred successfully");
        println!("   - Post pot after: {}", post_pot_after.amount);
        println!("   - User vault after: {}", user_vault_after.amount);
    } else {
        println!("✅ No reward (user had 0 votes on winning side or reward was 0)");
    }

    println!("✅ Post reward claimed successfully");
}
