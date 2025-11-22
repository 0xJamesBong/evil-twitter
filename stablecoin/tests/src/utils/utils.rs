use std::collections::HashMap;

use anchor_client::Program;
use anchor_spl::associated_token::spl_associated_token_account::instruction::create_associated_token_account;
use anchor_spl::{
    associated_token::spl_associated_token_account::{
        self, get_associated_token_address_with_program_id,
    },
    token::spl_token,
};
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::{
    instruction::Instruction,
    loader_v4::{create_buffer, deploy_from_source, id as loader_v4_id, write},
    message::{v0::Message, VersionedMessage},
    native_token::LAMPORTS_PER_SOL,
    program_pack::Pack,
    signature::{read_keypair_file, Keypair, Signature},
    signers::Signers,
    system_instruction::{self, create_account},
    transaction::VersionedTransaction,
}; // Add this import
use solana_sdk::{pubkey::Pubkey, signer::Signer};

pub async fn setup_token_mint(
    rpc: &RpcClient,
    payer: &Keypair,
    mint_authority: &Keypair,
    program: &Program<&Keypair>,
    token_mint: &Keypair,
) -> Pubkey {
    let space = spl_token::state::Mint::LEN;
    let rent = rpc
        .get_minimum_balance_for_rent_exemption(space)
        .await
        .unwrap();

    // initialize jitosol_mint
    let create_token_mint_ix = system_instruction::create_account(
        &mint_authority.pubkey(),
        &token_mint.pubkey(),
        rent,
        spl_token::state::Mint::LEN as u64,
        &spl_token::ID,
    );
    println!("🌟 create_token_mint_ix: {:?}", create_token_mint_ix);

    // initialize jitosol_mint
    let initialize_token_mint_ix = spl_token::instruction::initialize_mint2(
        &spl_token::ID,
        &token_mint.pubkey(),
        &mint_authority.pubkey(),
        None,
        9,
    )
    .unwrap();
    println!(
        "🌟 initialize_token_mint_ix: {:?}",
        initialize_token_mint_ix
    );
    let token_setup_tx = send_tx(
        &rpc,
        vec![create_token_mint_ix, initialize_token_mint_ix],
        &payer.pubkey(),
        &[&payer, &token_mint],
    )
    .await
    .unwrap();
    println!("🌟{:} setup tx: {:}", token_mint.pubkey(), token_setup_tx);
    mint_authority.pubkey()
}

pub async fn setup_token_mint_ata_and_mint_to(
    rpc: &RpcClient,
    payer: &Keypair,
    mint_authority: &Keypair,
    mint_to: &Pubkey,
    program: &Program<&Keypair>,
    token_mint: &Keypair,
    amount: u64,
    jitosol_mint: &Keypair,
    shitcoin_mint: &Keypair,
    ourtoken_mint: &Keypair,
    usdc_mint: &Keypair,
) -> Pubkey {
    let token_name = match token_mint.pubkey() {
        pk if pk == jitosol_mint.pubkey() => "JitoSOL",
        pk if pk == shitcoin_mint.pubkey() => "Shitcoin",
        pk if pk == ourtoken_mint.pubkey() => "Ourtoken",
        pk if pk == usdc_mint.pubkey() => "USDC",
        _ => "Unknown",
    };

    // Create the ATA first
    let create_ata_ix = create_associated_token_account(
        &payer.pubkey(),
        &mint_to,
        &token_mint.pubkey().clone(),
        &spl_token::ID,
    );
    println!("🌟 create_ata_ix: {:?}", create_ata_ix);
    let user_token_ata = spl_associated_token_account::get_associated_token_address(
        &mint_to,
        &token_mint.pubkey().clone(),
    );
    println!("🌟 user_token_ata: {:?}", user_token_ata);

    let token_setup_tx = send_tx(
        &rpc,
        vec![
            // create_token_mint_ix,
            // initialize_token_mint_ix,
            create_ata_ix,
        ],
        &payer.pubkey(),
        &[&payer],
    )
    .await
    .unwrap();

    println!("🌟{:} setup tx: {:}", token_name, token_setup_tx);

    // mint a big balance to the user

    let mint_token_to_user_ix = spl_token::instruction::mint_to(
        &spl_token::ID,
        &token_mint.pubkey().clone(),
        &user_token_ata,
        &mint_authority.pubkey(),
        &[&mint_authority.pubkey()],
        1_000_000_000 * LAMPORTS_PER_SOL,
    )
    .unwrap();

    println!("🌟 mint_token_to_user_ix: {:?}", mint_token_to_user_ix);
    let token_mint_tx = send_tx(
        &rpc,
        vec![mint_token_to_user_ix],
        &payer.pubkey(),
        &[&mint_authority],
    )
    .await
    .unwrap();

    let user_token_balance = program
        .account::<anchor_spl::token::TokenAccount>(user_token_ata)
        .await
        .unwrap();

    assert_eq!(user_token_balance.amount, 1_000_000_000 * LAMPORTS_PER_SOL);
    println!(
        "🌟 User {} balance after mint: {}",
        token_name, user_token_balance.amount
    );

    println!("🌟 {} mint tx: {}", token_name, token_mint_tx);
    println!("\n\n");
    user_token_ata
}

pub async fn airdrop_sol_to_users(rpc: &RpcClient, users: &HashMap<Pubkey, String>) {
    for (user, name) in users {
        println!("🌟 airdropping sol to user {}", name);
        let airdrop_result = rpc.request_airdrop(user, 100 * LAMPORTS_PER_SOL).await;
        match airdrop_result {
            Ok(signature) => println!("✅ User {} airdrop successful: {}", user, signature),
            Err(e) => println!("❌ User {} airdrop failed: {:?}", user, e),
        }
        // Wait for airdrops to be confirmed
        println!("Waiting for airdrops to be confirmed...");
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

        // // Check actual balances
        let user_balance = rpc.get_balance(user).await.unwrap();
        println!("🌟 User {} balance: {}", name, user_balance);

        println!(
            "💰 Payer balance: {} lamports ({} SOL)",
            user_balance,
            user_balance as f64 / LAMPORTS_PER_SOL as f64
        );
    }
}
pub async fn setup_token_mint_ata_and_mint_to_many_users(
    rpc: &RpcClient,
    payer: &Keypair,
    mint_authority: &Keypair,
    users: &Vec<Pubkey>,
    program: &Program<&Keypair>,
    token_mint: &Keypair,
    amount: u64,
    jitosol_mint: &Keypair,
    shitcoin_mint: &Keypair,
    ourtoken_mint: &Keypair,
    usdc_mint: &Keypair,
) -> HashMap<Pubkey, Pubkey> {
    // create a dictionary
    let mut users_token_atas = HashMap::new();
    for i in 0..users.len() {
        let user_i_token_ata = setup_token_mint_ata_and_mint_to(
            rpc,
            payer,
            mint_authority,
            &users[i],
            program,
            token_mint,
            amount,
            jitosol_mint,
            shitcoin_mint,
            ourtoken_mint,
            usdc_mint,
        )
        .await;
        users_token_atas.insert(users[i], user_i_token_ata);
    }
    users_token_atas
}

pub async fn send_tx<T: Signers + ?Sized>(
    rpc: &RpcClient,
    ixs: Vec<Instruction>,
    payer: &Pubkey,
    signer: &T,
) -> anyhow::Result<Signature> {
    let blockhash = rpc.get_latest_blockhash().await?;
    let message = Message::try_compile(payer, &ixs, &[], blockhash)?;
    let v0_message = VersionedMessage::V0(message);
    let tx = VersionedTransaction::try_new(v0_message, signer)?;

    let result = rpc.send_and_confirm_transaction(&tx).await;

    // inspect error if any
    match result {
        Err(e) => {
            eprintln!("❌ Transaction failed: {:#?}", e);
            return Err(e.into());
        }
        Ok(signature) => {
            // Verify the transaction actually succeeded
            let status = rpc.get_signature_status(&signature).await?;

            if let Some(transaction_status) = status {
                if let Some(err) = transaction_status.err() {
                    return Err(anyhow::anyhow!("Transaction failed: {:?}", err));
                }
            }

            Ok(signature)
        }
    }
}
