use crate::pda_seeds::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::ErrorCode;

// -----------------------------------------------------------------------------
// CONTEXTS
// -----------------------------------------------------------------------------

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

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
    #[account(mut)]
    pub user: Signer<'info>,

    // This must be kept because we don't want strangers initializing user accounts for other users. 
    #[account(mut,
        constraint = payer.key() == config.payer_authroity || payer.key() == user.key()
    )]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        seeds = [USER_ACCOUNT_SEED, user.key().as_ref()],
        bump,
        space = 8 + 64,
    )]
    pub user_account: Account<'info, UserAccount>,
    
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(session_key: Pubkey, expires_at: i64, privileges_hash: [u8; 32])]
pub struct RegisterSessionKey<'info> {
    #[account(mut)]
    pub user: Signer<'info>,        // wallet giving delegation

    #[account(
        init,
        payer = user,
        seeds = [
            SESSION_AUTHORITY_SEED,
            user.key().as_ref(),
            session_key.as_ref()       // <--- correct
        ],
        bump,
        space = 8 + SessionAuthority::INIT_SPACE,
    )]
    pub session_authority: Account<'info, SessionAuthority>, // <--- PDA storing metadata

    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
#[instruction(session_key: Pubkey, new_expires_at: i64)]
pub struct RenewSessionKey<'info> {
    #[account(mut)]
    pub user: Signer<'info>,  // MUST be the real wallet signing

    #[account(
        mut,
        seeds = [
            SESSION_AUTHORITY_SEED,
            user.key().as_ref(),
            session_key.as_ref()
        ],
        bump,
    )]
    pub session_authority: Account<'info, SessionAuthority>, // <--- PDA storing metadata
}


/// User deposits from their wallet into the program-controlled vault.
/// Also initializes the program-controlled vault if it doesn't exist.
#[derive(Accounts)]
pub struct Deposit<'info> {
    // Here the user must be a signer. If we want to use someone else to pay other than our centralized payer, just pass user into payer.
    #[account(mut)]
    pub user: Signer<'info>,

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
 
   /// Signer paying the TX fee (user or backend)
   #[account(mut)]
   pub payer: Signer<'info>,

   /// CHECK: raw signer pubkey (can be wallet or session key)
   pub authority: UncheckedAccount<'info>,

   #[account(
       mut,
       seeds = [
           SESSION_AUTHORITY_SEED,
           user.key().as_ref(),
           authority.key().as_ref()
       ],
       bump,
   )]
   pub session_authority: Option<Account<'info, SessionAuthority>>,
    
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

// Correct logical model
// Field	Conceptual role	When equal?	When MUST be different
// voter	Identity who owns state	Direct signing mode	Delegated mode
// authority	Who is signing this instruction	Direct signing mode	Session key signing
// payer	Who pays compute/fees	User pays fees	Backend subsidizing fees
// They can collapse into one key only in direct signing mode:
// voter = authority = payer = user wallet


// This is the normal wallet UX.

// But they MUST be separate in delegated / session mode:
// voter = real wallet identity
// authority = session key (our ephemeral signer)
// payer = backend payer account

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
    
    /// Signer paying the TX fee (user or backend)
    #[account(mut)]
    pub payer: Signer<'info>,
 
    /// CHECK: raw signer pubkey (can be wallet or session key)
    pub authority: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            SESSION_AUTHORITY_SEED,
            voter.key().as_ref(),
            authority.key().as_ref()
        ],
        bump,
    )]
    pub session_authority: Option<Account<'info, SessionAuthority>>,

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
    
    #[account(mut,
    )]
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


// The User-uncheckedAccount and payer-Signer pattern is used to allow for dual signing - so the user doesn't need to see a signature prompt pop-up

#[derive(Accounts)]
#[instruction(session_key: Pubkey, post_id_hash: [u8; 32])]
pub struct ClaimPostReward<'info> {
    #[account(mut,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, Config>,
    /// CHECK: User is marked as an UncheckedAccount so that it could be just a pubkey or a signer - allowing for dual signing - in the case where the user wants to directly interact with the program and not use our centralized payer, just pass its own keypair to payer and user as the same keypair.
    #[account(mut)]
    pub user: UncheckedAccount<'info>,
     
   /// Signer paying the TX fee (user or backend)
   #[account(
    mut,
    
    )]
    pub payer: Signer<'info>,

    /// CHECK: raw signer pubkey (can be wallet or session key)
    #[account(mut,)]
    pub authority: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            SESSION_AUTHORITY_SEED,
            user.key().as_ref(),
            authority.key().as_ref()
        ],
        bump,
    )]
    pub session_authority: Option<Account<'info, SessionAuthority>>,

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

    #[account(mut)]
    pub user_vault_token_account: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// -----------------------------------------------------------------------------
// ERRORS
// -----------------------------------------------------------------------------
// ErrorCode moved to lib.rs at crate root
