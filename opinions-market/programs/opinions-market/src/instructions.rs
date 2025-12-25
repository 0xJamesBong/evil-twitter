use crate::pda_seeds::*;
use crate::states::*;
use crate::ErrorCode;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions;
use anchor_spl::token::{Mint, Token, TokenAccount};

// -----------------------------------------------------------------------------
// CONTEXTS
// -----------------------------------------------------------------------------

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init, payer = payer, seeds = [OM_CONFIG_SEED], bump, space = 8 + OMConfig::INIT_SPACE)]
    pub om_config: Account<'info, OMConfig>,
    pub system_program: Program<'info, System>,
}
// The User-uncheckedAccount and payer-Signer pattern is used to allow for dual signing - so the user doesn't need to see a signature prompt pop-up
#[derive(Accounts)]
#[instruction(post_id_hash: [u8; 32])]
pub struct CreatePost<'info> {
    #[account(mut,
        seeds = [OM_CONFIG_SEED],
        bump,
    )]
    pub om_config: Account<'info, OMConfig>,
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

    /// CHECK: owned by opinions market - this is the voter data 
    #[account(init_if_needed, payer = payer, seeds = [VOTER_ACCOUNT_SEED, user.key().as_ref()], bump, space = 8 + VoterAccount::INIT_SPACE)]
    pub voter_account: Account<'info, VoterAccount>,

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
        seeds = [OM_CONFIG_SEED],
        bump,
    )]
    pub om_config: Account<'info, OMConfig>,
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
        seeds = [OM_CONFIG_SEED],
          bump,
    )]
    pub om_config: Box<Account<'info, OMConfig>>,

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
    pub voter_account: Account<'info, VoterAccount>,

    /// CHECK: this is a token account, owned by the SPL program, but its authority is a pda inside the fed 
    /// - keep opague so Fed TokenAccount cpi will initialize it and we won't be stopped by TokenAccount here
    #[account(mut)]
    pub voter_user_vault_token_account: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [POSITION_SEED, post.key().as_ref(), voter.key().as_ref()],
        bump,
        space = 8 + VoterPostPosition::INIT_SPACE,
    )]
    pub position: Box<Account<'info, VoterPostPosition>>,


    // Vault authority opague passed from the fed 
    /// CHECK: just a pda - can't require #[account(owner = fed::ID)]
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

    /// CHECK: SPL token account whose authority is the fed - cannot do #[account(owner = fed::ID)]
    #[account(mut)]
    pub protocol_token_treasury_token_account: UncheckedAccount<'info>,

    // creator's vault for receiving creator fees
    /// CHECK: SPL token account whose authority is the fed - cannot do #[account(owner = fed::ID)]
    #[account(mut)]
    pub creator_vault_token_account: UncheckedAccount<'info>,

    /// CHECK: Creator user pubkey (used for PDA derivation in Fed, passed as account for convenience)
    /// This is the creator of the post, used to derive the creator vault PDA
    /// Marked as mut because Fed CPI requires it for init_if_needed on creator vault
    #[account(mut)]
    pub creator_user: UncheckedAccount<'info>,


    /// CHECK: Fed-owned ValidPayment account - let the fed check it
    #[account(owner = fed::ID)]
    pub valid_payment: UncheckedAccount<'info>,

    /// CHECK: Fed config PDA (authority of treasury token account) - let the fed check it
    #[account(owner = fed::ID)]
    pub fed_config: UncheckedAccount<'info>,

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

    /// CHECK: SPL token account whose authority is the fed - cannot do #[account(owner = fed::ID)]
    #[account(mut)]
    pub protocol_token_treasury_token_account: UncheckedAccount<'info>,

    // Optional parent post (if child)
    pub parent_post: Option<Account<'info, PostAccount>>,

    pub om_config: Account<'info, OMConfig>,
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

    // creator's vault for receiving creator fees
    /// CHECK: SPL token account whose authority is the fed - cannot do #[account(owner = fed::ID)]
    #[account(mut)]
    pub creator_vault_token_account: Account<'info, TokenAccount>,

    // Vault authority opague passed from the fed 
    /// CHECK: just a pda - can't require #[account(owner = fed::ID)]
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

    /// CHECK: SPL token account whose authority is the fed - cannot do #[account(owner = fed::ID)]
    #[account(mut)]
    pub protocol_token_treasury_token_account: Account<'info, TokenAccount>,

    pub om_config: Account<'info, OMConfig>,
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
        seeds = [OM_CONFIG_SEED],
        bump,
    )]
    pub om_config: Account<'info, OMConfig>,
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
        seeds = [VOTER_POST_MINT_CLAIM_SEED, post.key().as_ref(), token_mint.key().as_ref()], bump, space = 8 + VoterPostMintClaim::INIT_SPACE)]
        pub voter_post_mint_claim: Account<'info, VoterPostMintClaim>,

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


    /// CHECK: SPL token account whose authority is the fed - cannot do #[account(owner = fed::ID)]
    #[account(mut)]
    pub user_vault_token_account: Account<'info, TokenAccount>,

    // Vault authority opague passed from the fed 
    /// CHECK: just a pda - can't require #[account(owner = fed::ID)]
    pub vault_authority: UncheckedAccount<'info>,

    pub token_mint: Account<'info, Mint>,
    pub fed_program: Program<'info, fed::program::Fed>,
    pub persona_program: Program<'info, persona::program::Persona>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
