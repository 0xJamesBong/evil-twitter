use crate::pda_seeds::*;
use crate::states::*;
use crate::ErrorCode;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions;
use anchor_spl::token::{Mint, Token, TokenAccount};

// -----------------------------------------------------------------------------
// CONTEXTS
// -----------------------------------------------------------------------------

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

    /// CHECK: persona-owned session authority (opaque)
    #[account(owner = persona::ID)]
    pub session_authority: AccountInfo<'info>,

    /// CHECK: persona-owned user account (opaque) - used for checking authentication
    #[account(owner = persona::ID)]
    pub user_account: AccountInfo<'info>,

    /// CHECK: used for vote tallying and karma 
    #[account(init_if_needed, payer = payer, seeds = [VOTER_ACCOUNT_SEED, user.key().as_ref()], bump, space = 8 + VoterAccount::INIT_SPACE)]
    pub voter_account: AccountInfo<'info>,

    #[account(
        init,
        payer = payer,
        seeds = [POST_ACCOUNT_SEED, post_id_hash.as_ref()],
        bump,
        space = 8 + PostAccount::INIT_SPACE,
    )]
    pub post: Account<'info, PostAccount>,
    pub persona_program: Program<'info, persona::program::Persona>,
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

    /// CHECK: persona-owned session authority (opaque)
    #[account(owner = persona::ID)]
    pub session_authority: AccountInfo<'info>,

    /// CHECK: persona-owned user account (opaque)
    #[account(owner = persona::ID)]
    pub user_account: AccountInfo<'info>,

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

    pub persona_program: Program<'info, persona::program::Persona>,
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

    /// CHECK: real user identity (owner of UserAccount and vaults) - this is passed for authentication
    #[account(mut)]
    pub voter: UncheckedAccount<'info>,

    /// CHECK: Signer paying the TX fee (user or backend)
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: ephemeral delegated session key
    #[account(mut)]
    pub session_key: UncheckedAccount<'info>,

    /// CHECK: persona-owned session authority (opaque)
    #[account(owner = persona::ID)]
    pub session_authority: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [POST_ACCOUNT_SEED, post_id_hash.as_ref()],
        bump,
        constraint = post.state == PostState::Open @ ErrorCode::PostNotOpen,
    )]
    pub post: Box<Account<'info, PostAccount>>,

    /// CHECK: persona-owned user account (opaque)
    #[account(owner = persona::ID)]
    pub user_account: AccountInfo<'info>,

    /// CHECK: owned by opinions market - this is the voter data 
    #[account(init_if_needed, payer = payer, 
        seeds = [VOTER_ACCOUNT_SEED, voter.key().as_ref()], bump, space = 8 + VoterAccount::INIT_SPACE)]
    pub voter_account: AccountInfo<'info>,

    // this is the token vault in the fed 
    // #[account(
    //     mut,
    //     seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, voter.key().as_ref(), token_mint.key().as_ref()],
    //     bump,
    //     token::mint = token_mint, 
    //     token::authority = vault_authority,
    // )]
    #[account(owner = fed::ID)]
    pub voter_user_vault_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [POSITION_SEED, post.key().as_ref(), voter.key().as_ref()],
        bump,
        space = 8 + VoterPostPosition::INIT_SPACE,
    )]
    pub position: Box<Account<'info, VoterPostPosition>>,

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

    pub fed_program: Program<'info, fed::program::Fed>,
    pub persona_program: Program<'info, persona::program::Persona>,
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
    pub fed_program: Program<'info, fed::program::Fed>,
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
    pub fed_program: Program<'info, fed::program::Fed>,
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
    pub fed_program: Program<'info, fed::program::Fed>,
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

    /// CHECK: persona-owned session authority (opaque)
    #[account(owner = persona::ID)]
    pub session_authority: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [POST_ACCOUNT_SEED, post_id_hash.as_ref()],
        bump,
    )]
    pub post: Account<'info, PostAccount>,
    #[account(mut)]
    pub position: Account<'info, VoterPostPosition>,
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
    pub fed_program: Program<'info, fed::program::Fed>,
    pub persona_program: Program<'info, persona::program::Persona>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
