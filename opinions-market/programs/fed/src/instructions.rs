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
        seeds = [FED_CONFIG_SEED],
        bump,
        space = 8 + FedConfig::INIT_SPACE,
    )]
    pub fed_config: Account<'info, FedConfig>,
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
        token::authority = fed_config,
    )]
    pub protocol_bling_treasury: Account<'info, TokenAccount>,

    // DO NOT ADD USDC HERE, TREAT IT AS AN ALTERNATIVE PAYMENT MINT 
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RegisterValidPayment<'info> {
    #[account(mut,
    constraint = fed_config.admin == admin.key())]
    pub fed_config: Account<'info, FedConfig>,
    // we need to require this to be the admin of the fed_config account
    #[account(mut)]
    pub admin: Signer<'info>,
    pub token_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = admin,
        seeds = [VALID_PAYMENT_SEED, token_mint.key().as_ref()],
        bump,
        space = 8 + ValidPayment::INIT_SPACE,
        constraint = token_mint.key() != fed_config.bling_mint @ ErrorCode::BlingCannotBeAlternativePayment,
    )]
    pub valid_payment: Account<'info, ValidPayment>,

    /// NEW treasury token account for this mint, canonical PDA.
    #[account(
        init,
        payer = admin,
        seeds = [PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED, token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = fed_config, // <-- SPL owner = fed_config PDA
    )]
    pub protocol_token_treasury_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}


#[derive(Accounts)]
pub struct ModifyAcceptedMint<'info> {
    #[account(
        mut,
        seeds        = [FED_CONFIG_SEED],
        bump,
        constraint = fed_config.admin == admin.key(),
    )]
    pub fed_config: Account<'info, FedConfig>,

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

    /// CHECK: persona-owned user account
      /// Persona-owned user account (OPAQUE)
    /// We only check ownership + PDA derivation
    #[account(owner = persona::ID)]
    pub user_account: AccountInfo<'info>,

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

    /// CHECK: persona-owned user account
      /// Persona-owned user account (OPAQUE)
    /// We only check ownership + PDA derivation
    #[account(
        owner = persona::ID,
    )]
    pub user_account: AccountInfo<'info>,
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


    /// CHECK: persona-owned session authority (opaque)
    #[account(owner = persona::ID)]
    pub session_authority: AccountInfo<'info>,

    
    /// CHECK: persona-owned user account (opaque)
    #[account(owner = persona::ID)]
    pub sender_user_account: AccountInfo<'info>,

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

    pub persona_program: Program<'info, persona::program::Persona>,
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

    /// CHECK: persona-owned session authority (opaque)
    #[account(owner = persona::ID)]
    pub session_authority: AccountInfo<'info>,

    /// CHECK: persona-owned user account (opaque)
    #[account(owner = persona::ID)]
    pub user_account: AccountInfo<'info>,

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

    /// CHECK: Persona program for CPI calls
    pub persona_program: Program<'info, persona::program::Persona>,

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

    /// CHECK: persona-owned session authority (opaque)
    #[account(owner = persona::ID)]
    pub session_authority: AccountInfo<'info>,

    /// CHECK: persona-owned user account (opaque)
    #[account(owner = persona::ID)]
    pub sender_user_account: AccountInfo<'info>,

    
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

    /// CHECK: Persona program for CPI calls
    pub persona_program: Program<'info, persona::program::Persona>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// Transfer tokens INTO Fed custody.
/// External account → Fed vault.
#[derive(Accounts)]
pub struct TransferIntoFedUserAccount<'info> {
    /// CHECK: External token account (not Fed-owned)
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    
    /// CHECK: MUST be signer (wallet or PDA via upstream CPI)
    /// The token program will verify the signature
    #[account(signer)]
    pub from_authority: UncheckedAccount<'info>,
    

    /// CHECK: User pubkey used to derive the destination vault PDA
    #[account(mut)]
    pub user: UncheckedAccount<'info>,

    /// CHECK: Fed vault token account (Fed-owned)
    #[account(
            init_if_needed,
            payer = payer,
    seeds = [
        USER_VAULT_TOKEN_ACCOUNT_SEED,
        user.key().as_ref(),
        token_mint.key().as_ref()
    ],
    bump,
    
    token::mint = token_mint,
    token::authority = vault_authority)]
    pub to_user_vault_token_account: Account<'info, TokenAccount>,


    #[account(
        seeds = [VALID_PAYMENT_SEED, token_mint.key().as_ref()],
        bump = valid_payment.bump,
        constraint = valid_payment.enabled @ ErrorCode::MintNotEnabled,
    )]
    pub valid_payment: Box<Account<'info, ValidPayment>>,
    
    /// CHECK: Vault authority PDA (Fed-owned, signs the transfer)
    #[account(
    seeds = [VAULT_AUTHORITY_SEED],
    bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    pub token_mint: Account<'info, Mint>,
    
    /// CHECK: Payer for account initialization (if needed)
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// Transfer tokens INTO Fed treasury custody.
/// External account → Fed treasury.
#[derive(Accounts)]
pub struct TransferIntoFedTreasuryAccount<'info> {
    /// CHECK: External token account (not Fed-owned)
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    
    /// CHECK: Authority of the `from` account (must sign the transaction)
    /// The token program will verify the signature
    pub from_authority: UncheckedAccount<'info>,
    
    /// CHECK: Fed treasury token account (Fed-owned)
    #[account(
        mut,
        seeds = [
            PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED,
            token_mint.key().as_ref()
        ],
        bump,
        token::mint = token_mint,
        token::authority = fed_config,
    )]
    pub protocol_treasury_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [VALID_PAYMENT_SEED, token_mint.key().as_ref()],
        bump = valid_payment.bump,
        constraint = valid_payment.enabled @ ErrorCode::MintNotEnabled,
    )]
    pub valid_payment: Box<Account<'info, ValidPayment>>,
    
    /// CHECK: Config PDA (authority of treasury token account)
    #[account(
        seeds = [FED_CONFIG_SEED],
        bump,
    )]
    pub fed_config: Account<'info, FedConfig>,

    pub token_mint: Account<'info, Mint>,
    
    pub token_program: Program<'info, Token>,
}

/// Transfer tokens OUT OF Fed custody.
/// Fed vault → External account.
#[derive(Accounts)]
pub struct TransferOutOfFedUserAccount<'info> {
    /// CHECK: User pubkey used to derive the source vault PDA
    pub user_from: UncheckedAccount<'info>,
    
    /// CHECK: User pubkey used to derive the source vault PDA
    #[account(mut)]
    pub user: UncheckedAccount<'info>,

    /// CHECK: Fed vault token account (Fed-owned)
    #[account(
    mut,
    seeds = [
        USER_VAULT_TOKEN_ACCOUNT_SEED,
        user.key().as_ref(),
        token_mint.key().as_ref()
    ],
    bump,
    token::mint = token_mint,
    token::authority = vault_authority)]
    pub from_user_vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: External token account (not Fed-owned, e.g., OM post pot)
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,

    #[account(
        seeds = [VALID_PAYMENT_SEED, token_mint.key().as_ref()],
        bump = valid_payment.bump,
        constraint = valid_payment.enabled @ ErrorCode::MintNotEnabled,
    )]
    pub valid_payment: Box<Account<'info, ValidPayment>>,

    pub token_mint: Account<'info, Mint>,

    /// CHECK: Vault authority PDA (Fed-owned, signs the transfer)
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
}


/// Convert dollar to token and charge from user vault to protocol treasury.
#[derive(Accounts)]
pub struct ConvertDollarAndChargeToProtocolTreasury<'info> {
    /// CHECK: User pubkey used to derive the user vault PDA
    #[account(mut)]
    pub user: UncheckedAccount<'info>,

    /// CHECK: User vault token account (Fed-owned, source of charge)
    #[account(
        mut,
        seeds = [
            USER_VAULT_TOKEN_ACCOUNT_SEED,
            user.key().as_ref(),
            token_mint.key().as_ref()
        ],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub from_user_vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Protocol treasury token account (Fed-owned, destination for charged tokens)
    #[account(
        mut,
        seeds = [
            PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED,
            token_mint.key().as_ref()
        ],
        bump,
        token::mint = token_mint,
        token::authority = fed_config,
    )]
    pub protocol_treasury_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [VALID_PAYMENT_SEED, token_mint.key().as_ref()],
        bump = valid_payment.bump,
        constraint = valid_payment.enabled @ ErrorCode::MintNotEnabled,
    )]
    pub valid_payment: Box<Account<'info, ValidPayment>>,

    pub token_mint: Account<'info, Mint>,

    /// CHECK: Config PDA (authority of treasury token account)
    #[account(
        seeds = [FED_CONFIG_SEED],
        bump,
    )]
    pub fed_config: Account<'info, FedConfig>,

    /// CHECK: Vault authority PDA (Fed-owned, signs the transfer)
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
}

/// Convert dollar to token and transfer from user vault to external account.
#[derive(Accounts)]
pub struct ConvertDollarAndTransferOutOfFedUserAccount<'info> {
    /// CHECK: User pubkey used to derive the source vault PDA
    pub user_from: UncheckedAccount<'info>,
    
    /// CHECK: User pubkey used to derive the source vault PDA
    #[account(mut)]
    pub user: UncheckedAccount<'info>,

    /// CHECK: User vault token account (Fed-owned, source of transfer)
    #[account(
        mut,
        seeds = [
            USER_VAULT_TOKEN_ACCOUNT_SEED,
            user.key().as_ref(),
            token_mint.key().as_ref()
        ],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub from_user_vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: External token account (not Fed-owned, e.g., OM post pot, creator vault)
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,

    #[account(
        seeds = [VALID_PAYMENT_SEED, token_mint.key().as_ref()],
        bump = valid_payment.bump,
        constraint = valid_payment.enabled @ ErrorCode::MintNotEnabled,
    )]
    pub valid_payment: Account<'info, ValidPayment>,

    pub token_mint: Account<'info, Mint>,

    /// CHECK: Vault authority PDA (Fed-owned, signs the transfer)
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
}

/// Account struct for transferring from Fed user vault to another Fed user vault
/// Supports init_if_needed for the destination vault
#[derive(Accounts)]
pub struct ConvertDollarAndTransferOutOfFedUserAccountToFedUserAccount<'info> {
    /// CHECK: User pubkey used to derive the source vault PDA
    #[account(mut)]
    pub user_from: UncheckedAccount<'info>,
    
    /// CHECK: User pubkey used to derive the destination vault PDA (creator)
    #[account(mut)]
    pub user_to: UncheckedAccount<'info>,

    /// CHECK: User vault token account (Fed-owned, source of transfer)
    #[account(
        mut,
        seeds = [
            USER_VAULT_TOKEN_ACCOUNT_SEED,
            user_from.key().as_ref(),
            token_mint.key().as_ref()
        ],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub from_user_vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Creator vault token account (Fed-owned, destination of transfer)
    /// This will be initialized if it doesn't exist
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [
            USER_VAULT_TOKEN_ACCOUNT_SEED,
            user_to.key().as_ref(),
            token_mint.key().as_ref()
        ],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub to_user_vault_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [VALID_PAYMENT_SEED, token_mint.key().as_ref()],
        bump = valid_payment.bump,
        constraint = valid_payment.enabled @ ErrorCode::MintNotEnabled,
    )]
    pub valid_payment: Account<'info, ValidPayment>,

    pub token_mint: Account<'info, Mint>,

    /// CHECK: Vault authority PDA (Fed-owned, signs the transfer)
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,
    
    /// CHECK: Payer for account initialization (if needed)
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckTransfer<'info> {
    #[account(mut
    ,token::mint = token_mint,
    
    )]
    pub from: Account<'info, TokenAccount>,
    #[account(mut,token::mint = token_mint,)]
    pub to: Account<'info, TokenAccount>,

    #[account(
        seeds = [VALID_PAYMENT_SEED, token_mint.key().as_ref()],
        bump = valid_payment.bump,
        constraint = valid_payment.enabled @ ErrorCode::MintNotEnabled,
    )]
    pub valid_payment: Box<Account<'info, ValidPayment>>,

    pub token_mint: Account<'info, Mint>,
    
}
