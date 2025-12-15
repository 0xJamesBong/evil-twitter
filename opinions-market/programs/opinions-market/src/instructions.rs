use crate::pda_seeds::*;
use crate::states::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::ErrorCode;


// -----------------------------------------------------------------------------
// CONTEXTS
// -----------------------------------------------------------------------------

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: Payer for transaction fees and account initialization
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,  
        seeds = [CONFIG_SEED],
        bump,
        space = 8 + Config::INIT_SPACE,
    )]
    pub config: Account<'info, Config>,
    pub bling_mint: Account<'info, Mint>,
    pub usdc_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = payer,
        seeds = [VALID_PAYMENT_SEED, bling_mint.key().as_ref()],
        bump,
        space = 8 + ValidPayment::INIT_SPACE, 
    )]
    pub valid_payment: Account<'info, ValidPayment>,

    #[account(
        init,
        payer = payer,
        seeds = [PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED, bling_mint.key().as_ref()],bump,
        token::mint = bling_mint,
        token::authority = config,
    )]
    pub protocol_bling_treasury: Account<'info, TokenAccount>,

    // DO NOT ADD USDC HERE, TREAT IT AS AN ALTERNATIVE PAYMENT MINT 
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RegisterValidPayment<'info> {
    #[account(mut,
    constraint = config.admin == admin.key())]
    pub config: Account<'info, Config>,
    // we need to require this to be the admin of the config account
    #[account(mut)]
    pub admin: Signer<'info>,
    pub token_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = admin,
        seeds = [VALID_PAYMENT_SEED, token_mint.key().as_ref()],
        bump,
        space = 8 + ValidPayment::INIT_SPACE,
        constraint = token_mint.key() != config.bling_mint @ ErrorCode::BlingCannotBeAlternativePayment,
    )]
    pub valid_payment: Account<'info, ValidPayment>,

    /// NEW treasury token account for this mint, canonical PDA.
    #[account(
        init,
        payer = admin,
        seeds = [PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED, token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = config, // <-- SPL owner = config PDA
    )]
    pub protocol_token_treasury_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}


#[derive(Accounts)]
pub struct ModifyAcceptedMint<'info> {
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump,
        constraint = config.admin == admin.key(),
    )]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [VALID_PAYMENT_SEED, mint.key().as_ref()],
        bump = accepted_mint.bump,
    )]
    pub accepted_mint: Account<'info, ValidPayment>,
}



// This initializes the UserAccount PDA only
#[derive(Accounts)]
pub struct CreateUser<'info> {
    #[account(mut,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, Config>,
    // This is the only case where the user remains a signer - keeps it real bro.
    /// CHECK: User is marked as an UncheckedAccount to allow for dual signing patterns
    #[account(mut)]
    pub user: UncheckedAccount<'info>,

    
   // This must be kept because we don't want strangers initializing user accounts for other users. 
   /// CHECK: Payer can be either the user or backend payer, allowing for flexible fee payment
   #[account(mut,
    // constraint = payer.key() == config.payer_authroity || payer.key() == user.key()
    )]
    pub payer: Signer<'info>,
   
    #[account(
        init,
        payer = payer,
        seeds = [USER_ACCOUNT_SEED, user.key().as_ref()],
        bump,
        space = 8 + UserAccount::INIT_SPACE,
    )]
    pub user_account: Account<'info, UserAccount>,
    
    
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
#[instruction(expected_index: u8)]
pub struct RegisterSession<'info> {
    /// CHECK: Payer for transaction fees and session authority account initialization
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: the user wallet we are delegating authority for
    pub user: UncheckedAccount<'info>,

    /// CHECK: ephemeral delegated session key
    pub session_key: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [SESSION_AUTHORITY_SEED, user.key().as_ref(), session_key.key().as_ref()],
        bump,
        space = 8 + SessionAuthority::INIT_SPACE,
    )]
    pub session_authority: Account<'info, SessionAuthority>,

    /// CHECK: sysvar required to load instructions in the tx
    #[account(address = instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}



/// User deposits from their wallet into the program-controlled vault.
/// Also initializes the program-controlled vault if it doesn't exist.
#[derive(Accounts)]
pub struct Deposit<'info> {
    // Here the user must be a signer. If we want to use someone else to pay other than our centralized payer, just pass user into payer.
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: Payer for transaction fees (can be user or backend)
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [USER_ACCOUNT_SEED, user.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        seeds = [VALID_PAYMENT_SEED, token_mint.key().as_ref()],
        bump = valid_payment.bump,
        constraint = valid_payment.enabled @ ErrorCode::MintNotEnabled,
    )]
    pub valid_payment: Account<'info, ValidPayment>,

    #[account(mut)]
    pub user_token_ata: Account<'info, TokenAccount>,

    /// CHECK: Vault authority PDA derived from seeds
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, user.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub user_vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}



#[derive(Accounts)]
pub struct Withdraw<'info> {
    // Here the user must be a signer. If we want to use someone else to pay other than our centralized payer, just pass user into payer.
    #[account(mut)]
    pub user: Signer<'info>,    

    /// CHECK: Payer for transaction fees (can be user or backend)
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [USER_ACCOUNT_SEED, user.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    pub token_mint: Account<'info, Mint>,

    // user’s personal wallet ATA for this mint
    #[account(mut)]
    pub user_token_dest_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, user.key().as_ref(), token_mint.key().as_ref()],
        bump,
        constraint = user_vault_token_account.owner == vault_authority.key(),
        constraint = user_vault_token_account.mint == token_mint.key(),
    )]
    pub user_vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Global vault authority PDA derived from seeds
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

// The User-uncheckedAccount and payer-Signer pattern is used to allow for dual signing - so the user doesn't need to see a signature prompt pop-up
#[derive(Accounts)]
#[instruction(post_id_hash: [u8; 32])]
pub struct CreatePost<'info> {
    #[account(mut,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, Config>,
    /// CHECK: real user identity (owner of UserAccount and vaults)
    #[account(mut)]
    pub user: UncheckedAccount<'info>,
 
   /// CHECK: Signer paying the TX fee (user or backend)
   #[account(mut)]
   pub payer: UncheckedAccount<'info>,

    /// CHECK: ephemeral delegated session key
    #[account(mut)]
    pub session_key: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [SESSION_AUTHORITY_SEED, user.key().as_ref(), session_key.key().as_ref()],
        bump,
    )]
    pub session_authority: Account<'info, SessionAuthority>,

    #[account(
        seeds = [USER_ACCOUNT_SEED, user.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        init,
        payer = payer,
        seeds = [POST_ACCOUNT_SEED, post_id_hash.as_ref()],
        bump,
        space = 8 + PostAccount::INIT_SPACE,
    )]
    pub post: Account<'info, PostAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(answer_post_id_hash: [u8; 32], question_post_id_hash: [u8; 32])]
pub struct CreateAnswer<'info> {
    #[account(mut,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, Config>,
    /// CHECK: real user identity (owner of UserAccount and vaults)
    #[account(mut)]
    pub user: UncheckedAccount<'info>,

    /// CHECK: Signer paying the TX fee (user or backend)
    #[account(mut)]
    pub payer: UncheckedAccount<'info>,

    /// CHECK: ephemeral delegated session key
    #[account(mut)]
    pub session_key: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [SESSION_AUTHORITY_SEED, user.key().as_ref(), session_key.key().as_ref()],
        bump,
    )]
    pub session_authority: Account<'info, SessionAuthority>,

    #[account(
        seeds = [USER_ACCOUNT_SEED, user.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        init,
        payer = payer,
        seeds = [POST_ACCOUNT_SEED, answer_post_id_hash.as_ref()],
        bump,
        space = 8 + PostAccount::INIT_SPACE,
    )]
    pub post: Account<'info, PostAccount>,

    /// CHECK: The question post this answer targets
    #[account(
        seeds = [POST_ACCOUNT_SEED, question_post_id_hash.as_ref()],
        bump,
    )]
    pub question_post: Account<'info, PostAccount>,

    pub system_program: Program<'info, System>,
}



// The User-uncheckedAccount and payer-Signer pattern is used to allow for dual signing - so the user doesn't need to see a signature prompt pop-up
#[derive(Accounts)]
#[instruction(side: Side, votes:u64, post_id_hash: [u8; 32])]
pub struct VoteOnPost<'info> {
    #[account(mut,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Box<Account<'info, Config>>,

     /// CHECK: real user identity (owner of UserAccount and vaults)
     #[account(mut)]
     pub voter: UncheckedAccount<'info>,
    
    /// CHECK: Signer paying the TX fee (user or backend)
    #[account(mut)]
    pub payer: Signer<'info>,


    /// CHECK: ephemeral delegated session key
    #[account(mut)]
    pub session_key: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [SESSION_AUTHORITY_SEED, voter.key().as_ref(), session_key.key().as_ref()],
        bump,
    )]
    pub session_authority: Account<'info, SessionAuthority>,

 
    #[account(
        mut,
        seeds = [POST_ACCOUNT_SEED, post_id_hash.as_ref()],
        bump,
        constraint = post.state == PostState::Open @ ErrorCode::PostNotOpen,
    )]
    pub post: Box<Account<'info, PostAccount>>,

    #[account(
        seeds = [USER_ACCOUNT_SEED, voter.key().as_ref()],
        bump,
    )]
    pub voter_user_account: Box<Account<'info, UserAccount>>,

    #[account(
        mut,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, voter.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub voter_user_vault_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [POSITION_SEED, post.key().as_ref(), voter.key().as_ref()],
        bump,
        space = 8 + UserPostPosition::INIT_SPACE,
    )]
    pub position: Box<Account<'info, UserPostPosition>>,

    /// CHECK: Vault authority PDA derived from seeds
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    // THIS IS NOW LAZY-CREATED
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [POST_POT_TOKEN_ACCOUNT_SEED, post.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = post_pot_authority,
    )]
    pub post_pot_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: Post pot authority PDA derived from seeds
    #[account(
        seeds = [POST_POT_AUTHORITY_SEED, post.key().as_ref()],
        bump,
    )]
    pub post_pot_authority: UncheckedAccount<'info>,

    // protocol treasury pot for this mint
    #[account(
        mut,
        seeds = [PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED, token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = config,
    )]
    pub protocol_token_treasury_token_account: Box<Account<'info, TokenAccount>>,

    // creator's vault for receiving creator fees
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, post.creator_user.as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub creator_vault_token_account: Box<Account<'info, TokenAccount>>,
    
    #[account(
        seeds = [VALID_PAYMENT_SEED, token_mint.key().as_ref()],
        bump = valid_payment.bump,
        constraint = valid_payment.enabled @ ErrorCode::MintNotEnabled,
    )]
    pub valid_payment: Box<Account<'info, ValidPayment>>,

    pub token_mint: Account<'info, Mint>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
#[instruction(post_id_hash: [u8; 32])]
pub struct SettlePost<'info> {
    /// CHECK: Payer for transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [POST_ACCOUNT_SEED, post_id_hash.as_ref()],
        bump,
    )]
    pub post: Account<'info, PostAccount>,

    #[account(
        mut,
        seeds = [POST_POT_TOKEN_ACCOUNT_SEED, post.key().as_ref(), token_mint.key().as_ref()],
        bump,
        constraint = post_pot_token_account.mint == token_mint.key(),
        constraint = post_pot_token_account.owner == post_pot_authority.key(),
    )]
    pub post_pot_token_account: Account<'info, TokenAccount>,

    /// CHECK: Post pot authority PDA derived from seeds
    #[account(
        seeds = [POST_POT_AUTHORITY_SEED, post.key().as_ref()],
        bump,
    )]
    pub post_pot_authority: UncheckedAccount<'info>,

    // per-post per-mint “snapshot” payout
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [POST_MINT_PAYOUT_SEED, post.key().as_ref(), token_mint.key().as_ref()],
        bump,
        space = 8 + PostMintPayout::INIT_SPACE
    )]
    pub post_mint_payout: Account<'info, PostMintPayout>,

    #[account(
        mut,
        seeds = [PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED, token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = config,
    )]
    pub protocol_token_treasury_token_account: Account<'info, TokenAccount>,

    // Optional parent post (if child)
    pub parent_post: Option<Account<'info, PostAccount>>,

    pub config: Account<'info, Config>,
    pub token_mint: Account<'info, Mint>,

    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(post_id_hash: [u8; 32])]
pub struct DistributeCreatorReward<'info> {
    /// CHECK: Payer for transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [POST_ACCOUNT_SEED, post_id_hash.as_ref()],
        bump,
    )]
    pub post: Account<'info, PostAccount>,

    #[account(
        mut,
        seeds = [POST_POT_TOKEN_ACCOUNT_SEED, post.key().as_ref(), token_mint.key().as_ref()],
        bump,
        constraint = post_pot_token_account.mint == token_mint.key(),
        constraint = post_pot_token_account.owner == post_pot_authority.key(),
    )]
    pub post_pot_token_account: Account<'info, TokenAccount>,

    /// CHECK: Post pot authority PDA
    #[account(
        seeds = [POST_POT_AUTHORITY_SEED, post.key().as_ref()],
        bump,
    )]
    pub post_pot_authority: UncheckedAccount<'info>,

    #[account(
        seeds = [POST_MINT_PAYOUT_SEED, post.key().as_ref(), token_mint.key().as_ref()],
        bump = post_mint_payout.bump,
    )]
    pub post_mint_payout: Account<'info, PostMintPayout>,

    #[account(
        mut,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, post.creator_user.as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub creator_vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Vault authority PDA
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(post_id_hash: [u8; 32])]
pub struct DistributeProtocolFee<'info> {
    /// CHECK: Payer for transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [POST_ACCOUNT_SEED, post_id_hash.as_ref()],
        bump,
    )]
    pub post: Account<'info, PostAccount>,

    #[account(
        mut,
        seeds = [POST_POT_TOKEN_ACCOUNT_SEED, post.key().as_ref(), token_mint.key().as_ref()],
        bump,
        constraint = post_pot_token_account.mint == token_mint.key(),
        constraint = post_pot_token_account.owner == post_pot_authority.key(),
    )]
    pub post_pot_token_account: Account<'info, TokenAccount>,

    /// CHECK: Post pot authority PDA
    #[account(
        seeds = [POST_POT_AUTHORITY_SEED, post.key().as_ref()],
        bump,
    )]
    pub post_pot_authority: UncheckedAccount<'info>,

    #[account(
        seeds = [POST_MINT_PAYOUT_SEED, post.key().as_ref(), token_mint.key().as_ref()],
        bump = post_mint_payout.bump,
    )]
    pub post_mint_payout: Account<'info, PostMintPayout>,

    #[account(
        mut,
        seeds = [PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED, token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = config,
    )]
    pub protocol_token_treasury_token_account: Account<'info, TokenAccount>,

    pub config: Account<'info, Config>,
    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

// This function is called only if the post is a child post
#[derive(Accounts)]
#[instruction(post_id_hash: [u8; 32])]
pub struct DistributeParentPostShare<'info> {
    /// CHECK: Payer for transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [POST_ACCOUNT_SEED, post_id_hash.as_ref()],
        bump,
    )]
    pub post: Account<'info, PostAccount>,

    #[account(
        mut,
        seeds = [POST_POT_TOKEN_ACCOUNT_SEED, post.key().as_ref(), token_mint.key().as_ref()],
        bump,
        constraint = post_pot_token_account.mint == token_mint.key(),
        constraint = post_pot_token_account.owner == post_pot_authority.key(),
    )]
    pub post_pot_token_account: Account<'info, TokenAccount>,

    /// CHECK: Post pot authority PDA
    #[account(
        seeds = [POST_POT_AUTHORITY_SEED, post.key().as_ref()],
        bump,
    )]
    pub post_pot_authority: UncheckedAccount<'info>,

    #[account(
        seeds = [POST_MINT_PAYOUT_SEED, post.key().as_ref(), token_mint.key().as_ref()],
        bump = post_mint_payout.bump,
    )]
    pub post_mint_payout: Account<'info, PostMintPayout>,

    // Required parent post (must be provided if this is a child post)
    pub parent_post: Account<'info, PostAccount>,

    #[account(
        mut,
        seeds = [POST_POT_TOKEN_ACCOUNT_SEED, parent_post.key().as_ref(), token_mint.key().as_ref()],
        bump,
        constraint = parent_post_pot_token_account.mint == token_mint.key(),
        constraint = parent_post_pot_token_account.owner == parent_post_pot_authority.key(),
    )]
    pub parent_post_pot_token_account: Account<'info, TokenAccount>,

    /// CHECK: Parent post pot authority PDA
    #[account(
        seeds = [POST_POT_AUTHORITY_SEED, parent_post.key().as_ref()],
        bump,
    )]
    pub parent_post_pot_authority: UncheckedAccount<'info>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}


// The User-uncheckedAccount and payer-Signer pattern is used to allow for dual signing - so the user doesn't need to see a signature prompt pop-up

#[derive(Accounts)]
#[instruction( post_id_hash: [u8; 32])]
pub struct ClaimPostReward<'info> {
    #[account(mut,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, Config>,
    /// CHECK: User is marked as an UncheckedAccount so that it could be just a pubkey or a signer - allowing for dual signing - in the case where the user wants to directly interact with the program and not use our centralized payer, just pass its own keypair to payer and user as the same keypair.
    #[account(mut)]
    pub user: UncheckedAccount<'info>,
     
   /// CHECK: Signer paying the TX fee (user or backend)
   #[account(mut)]
    pub payer: Signer<'info>,


    /// CHECK: ephemeral delegated session key
    #[account(mut)]
    pub session_key: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [SESSION_AUTHORITY_SEED, user.key().as_ref(), session_key.key().as_ref()],
        bump,
    )]
    pub session_authority: Account<'info, SessionAuthority>,


    #[account(
        mut,
        seeds = [POST_ACCOUNT_SEED, post_id_hash.as_ref()],
        bump,
    )]
    pub post: Account<'info, PostAccount>,
    #[account(mut)]
    pub position: Account<'info, UserPostPosition>,
    #[account(
        init_if_needed, 
        payer = payer, 
        seeds = [USER_POST_MINT_CLAIM_SEED, post.key().as_ref(), token_mint.key().as_ref()], bump, space = 8 + UserPostMintClaim::INIT_SPACE)]
    pub user_post_mint_claim: Account<'info, UserPostMintClaim>,

    #[account(
        seeds = [POST_MINT_PAYOUT_SEED, post.key().as_ref(), token_mint.key().as_ref()],
        bump = post_mint_payout.bump,
    )]
    pub post_mint_payout: Account<'info, PostMintPayout>,

    #[account(
        mut,
        seeds = [POST_POT_TOKEN_ACCOUNT_SEED, post.key().as_ref(), token_mint.key().as_ref()],
        bump,
        constraint = post_pot_token_account.owner == post_pot_authority.key(),
        constraint = post_pot_token_account.mint == token_mint.key(),
    )]
    pub post_pot_token_account: Account<'info, TokenAccount>,

    /// CHECK: Post pot authority PDA derived from seeds
    #[account(
        seeds = [POST_POT_AUTHORITY_SEED, post.key().as_ref()],
        bump,
    )]
    pub post_pot_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, user.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub user_vault_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: Vault authority PDA derived from seeds
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}



#[derive(Accounts)]
pub struct Tip<'info> {
    /// CHECK: Sender (can be session key or wallet)
    #[account(mut)]
    pub sender: UncheckedAccount<'info>,

    /// CHECK: Payer for transaction fees and account initialization
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Recipient of the tip (validated in instruction logic)
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,

    /// CHECK: ephemeral delegated session key (can be same as sender for wallet signing)
    #[account(mut)]
    pub session_key: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [SESSION_AUTHORITY_SEED, sender_user_account.user.as_ref(), session_key.key().as_ref()],
        bump,
    )]
    pub session_authority: Account<'info, SessionAuthority>,

    #[account(
        seeds = [USER_ACCOUNT_SEED, sender.key().as_ref()],
        bump,
    )]
    pub sender_user_account: Account<'info, UserAccount>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        seeds = [VALID_PAYMENT_SEED, token_mint.key().as_ref()],
        bump = valid_payment.bump,
        constraint = valid_payment.enabled @ ErrorCode::MintNotEnabled,
    )]
    pub valid_payment: Account<'info, ValidPayment>,

    #[account(
        mut,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, sender.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub sender_user_vault_token_account: Account<'info, TokenAccount>,

    
    /// CHECK: Global vault authority PDA
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [TIP_VAULT_SEED, recipient.key().as_ref(), token_mint.key().as_ref()],
        bump,
        space = 8 + TipVault::INIT_SPACE,
    )]
    pub tip_vault: Account<'info, TipVault>,

    
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [TIP_VAULT_TOKEN_ACCOUNT_SEED, recipient.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub tip_vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimTips<'info> {
    /// CHECK: Owner of the tip vault (can be session key or wallet)
    #[account(mut)]
    pub owner: UncheckedAccount<'info>,

    /// CHECK: Payer for transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: ephemeral delegated session key
    #[account(mut)]
    pub session_key: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [SESSION_AUTHORITY_SEED, owner.key().as_ref(), session_key.key().as_ref()],
        bump,
    )]
    pub session_authority: Account<'info, SessionAuthority>,

    #[account(
        seeds = [USER_ACCOUNT_SEED, owner.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [TIP_VAULT_SEED, owner.key().as_ref(), token_mint.key().as_ref()],
        bump,
    )]
    pub tip_vault: Account<'info, TipVault>,


    #[account(
        mut,
        seeds = [TIP_VAULT_TOKEN_ACCOUNT_SEED, owner.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub tip_vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Global vault authority PDA
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, owner.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub owner_user_vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SendToken<'info> {
    /// CHECK: Sender (can be session key or wallet)
    #[account(mut)]
    pub sender: UncheckedAccount<'info>,

    /// CHECK: Payer for transaction fees and account initialization
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Recipient of the tokens
    pub recipient: UncheckedAccount<'info>,

    /// CHECK: ephemeral delegated session key
    #[account(mut)]
    pub session_key: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [SESSION_AUTHORITY_SEED, sender_user_account.user.as_ref(), session_key.key().as_ref()],
        bump,
    )]
    pub session_authority: Account<'info, SessionAuthority>,

    #[account(
        seeds = [USER_ACCOUNT_SEED, sender.key().as_ref()],
        bump,
    )]
    pub sender_user_account: Account<'info, UserAccount>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        seeds = [VALID_PAYMENT_SEED, token_mint.key().as_ref()],
        bump = valid_payment.bump,
        constraint = valid_payment.enabled @ ErrorCode::MintNotEnabled,
    )]
    pub valid_payment: Account<'info, ValidPayment>,

    #[account(
        mut,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, sender.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub sender_user_vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Global vault authority PDA
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, recipient.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub recipient_user_vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// -----------------------------------------------------------------------------
// BOUNTY INSTRUCTIONS
// -----------------------------------------------------------------------------

#[derive(Accounts)]
#[instruction(question_post_id_hash: [u8; 32], amount: u64, expires_at: i64)]
pub struct CreateBounty<'info> {
    #[account(mut)]
    pub sponsor: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub session_key: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [SESSION_AUTHORITY_SEED, sponsor.key().as_ref(), session_key.key().as_ref()],
        bump,
    )]
    pub session_authority: Account<'info, SessionAuthority>,
    #[account(
        mut,
        seeds = [USER_ACCOUNT_SEED, sponsor.key().as_ref()],
        bump,
    )]
    pub sponsor_user_account: Account<'info, UserAccount>,
    #[account(
        seeds = [POST_ACCOUNT_SEED, question_post_id_hash.as_ref()],
        bump,
    )]
    pub question_post: Account<'info, PostAccount>,
    pub token_mint: Account<'info, Mint>,
    #[account(
        seeds = [VALID_PAYMENT_SEED, token_mint.key().as_ref()],
        bump = valid_payment.bump,
        constraint = valid_payment.enabled @ ErrorCode::MintNotEnabled,
    )]
    pub valid_payment: Account<'info, ValidPayment>,
    #[account(
        init,
        payer = payer,
        seeds = [BOUNTY_SEED, question_post.key().as_ref(), sponsor.key().as_ref(), token_mint.key().as_ref()],
        bump,
        space = 8 + BountyAccount::INIT_SPACE,
    )]
    pub bounty: Account<'info, BountyAccount>,
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [BOUNTY_VAULT_TOKEN_ACCOUNT_SEED, bounty.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub bounty_vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, sponsor.key().as_ref(), token_mint.key().as_ref()],
        bump,
    )]
    pub sponsor_vault_token_account: Account<'info, TokenAccount>,
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(question_post_id_hash: [u8; 32], additional_amount: u64)]
pub struct IncreaseBounty<'info> {
    #[account(mut)]
    pub sponsor: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub session_key: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [SESSION_AUTHORITY_SEED, sponsor.key().as_ref(), session_key.key().as_ref()],
        bump,
    )]
    pub session_authority: Account<'info, SessionAuthority>,
    #[account(
        seeds = [USER_ACCOUNT_SEED, sponsor.key().as_ref()],
        bump,
    )]
    pub sponsor_user_account: Account<'info, UserAccount>,
    #[account(
        seeds = [POST_ACCOUNT_SEED, question_post_id_hash.as_ref()],
        bump,
    )]
    pub question_post: Account<'info, PostAccount>,
    pub token_mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [BOUNTY_SEED, question_post.key().as_ref(), sponsor.key().as_ref(), token_mint.key().as_ref()],
        bump,
    )]
    pub bounty: Account<'info, BountyAccount>,
    #[account(
        mut,
        seeds = [BOUNTY_VAULT_TOKEN_ACCOUNT_SEED, bounty.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub bounty_vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, sponsor.key().as_ref(), token_mint.key().as_ref()],
        bump,
    )]
    pub sponsor_vault_token_account: Account<'info, TokenAccount>,
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(question_post_id_hash: [u8; 32], answer_post_id_hash: [u8; 32])]
pub struct AwardBounty<'info> {
    #[account(mut)]
    pub sponsor: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub session_key: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [SESSION_AUTHORITY_SEED, sponsor.key().as_ref(), session_key.key().as_ref()],
        bump,
    )]
    pub session_authority: Account<'info, SessionAuthority>,
    #[account(
        mut,
        seeds = [USER_ACCOUNT_SEED, sponsor.key().as_ref()],
        bump,
    )]
    pub sponsor_user_account: Account<'info, UserAccount>,
    #[account(
        seeds = [POST_ACCOUNT_SEED, question_post_id_hash.as_ref()],
        bump,
    )]
    pub question_post: Account<'info, PostAccount>,
    #[account(
        seeds = [POST_ACCOUNT_SEED, answer_post_id_hash.as_ref()],
        bump,
    )]
    pub answer_post: Account<'info, PostAccount>,
    pub token_mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [BOUNTY_SEED, question_post.key().as_ref(), sponsor.key().as_ref(), token_mint.key().as_ref()],
        bump,
    )]
    pub bounty: Account<'info, BountyAccount>,
}

#[derive(Accounts)]
#[instruction(question_post_id_hash: [u8; 32])]
pub struct CloseBountyNoAward<'info> {
    #[account(mut)]
    pub sponsor: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub session_key: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [SESSION_AUTHORITY_SEED, sponsor.key().as_ref(), session_key.key().as_ref()],
        bump,
    )]
    pub session_authority: Account<'info, SessionAuthority>,
    #[account(
        seeds = [USER_ACCOUNT_SEED, sponsor.key().as_ref()],
        bump,
    )]
    pub sponsor_user_account: Account<'info, UserAccount>,
    #[account(
        seeds = [POST_ACCOUNT_SEED, question_post_id_hash.as_ref()],
        bump,
    )]
    pub question_post: Account<'info, PostAccount>,
    pub token_mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [BOUNTY_SEED, question_post.key().as_ref(), sponsor.key().as_ref(), token_mint.key().as_ref()],
        bump,
    )]
    pub bounty: Account<'info, BountyAccount>,
}

#[derive(Accounts)]
#[instruction(question_post_id_hash: [u8; 32], sponsor: Pubkey)]
pub struct ExpireBounty<'info> {
    /// CHECK: Anyone can call this (permissionless)
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        seeds = [POST_ACCOUNT_SEED, question_post_id_hash.as_ref()],
        bump,
    )]
    pub question_post: Account<'info, PostAccount>,
    pub token_mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [BOUNTY_SEED, question_post.key().as_ref(), sponsor.as_ref(), token_mint.key().as_ref()],
        bump,
        constraint = bounty.sponsor == sponsor @ ErrorCode::Unauthorized,
    )]
    pub bounty: Account<'info, BountyAccount>,
    #[account(
        mut,
        seeds = [USER_ACCOUNT_SEED, sponsor.as_ref()],
        bump,
    )]
    pub sponsor_user_account: Account<'info, UserAccount>,
}

#[derive(Accounts)]
#[instruction(question_post_id_hash: [u8; 32], answer_post_id_hash: [u8; 32], sponsor: Pubkey)]
pub struct ClaimBounty<'info> {
    /// CHECK: Answer author (can be session key or wallet)
    #[account(mut)]
    pub answer_author: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub session_key: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [SESSION_AUTHORITY_SEED, answer_author.key().as_ref(), session_key.key().as_ref()],
        bump,
    )]
    pub session_authority: Account<'info, SessionAuthority>,
    #[account(
        seeds = [POST_ACCOUNT_SEED, question_post_id_hash.as_ref()],
        bump,
    )]
    pub question_post: Account<'info, PostAccount>,
    #[account(
        seeds = [POST_ACCOUNT_SEED, answer_post_id_hash.as_ref()],
        bump,
    )]
    pub answer_post: Account<'info, PostAccount>,
    pub token_mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [BOUNTY_SEED, question_post.key().as_ref(), sponsor.as_ref(), token_mint.key().as_ref()],
        bump,
        constraint = bounty.sponsor == sponsor @ ErrorCode::Unauthorized,
    )]
    pub bounty: Account<'info, BountyAccount>,
    #[account(
        mut,
        seeds = [BOUNTY_VAULT_TOKEN_ACCOUNT_SEED, bounty.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub bounty_vault_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, answer_author.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub answer_author_vault_token_account: Account<'info, TokenAccount>,
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(question_post_id_hash: [u8; 32])]
pub struct ReclaimBounty<'info> {
    #[account(mut)]
    pub sponsor: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub session_key: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [SESSION_AUTHORITY_SEED, sponsor.key().as_ref(), session_key.key().as_ref()],
        bump,
    )]
    pub session_authority: Account<'info, SessionAuthority>,
    #[account(
        mut,
        seeds = [USER_ACCOUNT_SEED, sponsor.key().as_ref()],
        bump,
    )]
    pub sponsor_user_account: Account<'info, UserAccount>,
    #[account(
        seeds = [POST_ACCOUNT_SEED, question_post_id_hash.as_ref()],
        bump,
    )]
    pub question_post: Account<'info, PostAccount>,
    pub token_mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [BOUNTY_SEED, question_post.key().as_ref(), sponsor.key().as_ref(), token_mint.key().as_ref()],
        bump,
    )]
    pub bounty: Account<'info, BountyAccount>,
    #[account(
        mut,
        seeds = [BOUNTY_VAULT_TOKEN_ACCOUNT_SEED, bounty.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub bounty_vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, sponsor.key().as_ref(), token_mint.key().as_ref()],
        bump,
    )]
    pub sponsor_vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED, token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = config,
    )]
    pub protocol_treasury_token_account: Account<'info, TokenAccount>,
    #[account(
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, Config>,
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

// -----------------------------------------------------------------------------
// ERRORS
// -----------------------------------------------------------------------------
// ErrorCode moved to lib.rs at crate root
