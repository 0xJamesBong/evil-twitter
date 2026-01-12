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
        seeds = [FREEPORT_CONFIG_SEED],
        bump,
        space = 8 + FreeportConfig::INIT_SPACE,
    )]
    pub freeport_config: Account<'info,  FreeportConfig>,
    
    // #[account(
    //     init,
    //     payer = payer,
    //     seeds = [FREEPORT_VALID_COLLECTION_SEED, nft_mint.key().as_ref()],
    //     bump,
    //     space = 8 + ValidCollection::INIT_SPACE, 
    // )]
    // pub valid_collection: Account<'info, ValidCollection>,
    
    // DO NOT ADD USDC HERE, TREAT IT AS AN ALTERNATIVE PAYMENT MINT 
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RegisterValidCollection<'info> {
    #[account(
        seeds = [FREEPORT_CONFIG_SEED],
        bump,
        constraint = freeport_config.admin == admin.key(),
    )]
    pub freeport_config: Account<'info, FreeportConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    /// Metaplex collection mint
    pub collection_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = admin,
        seeds = [FREEPORT_VALID_COLLECTION_SEED, collection_mint.key().as_ref()],
        bump,
        space = 8 + ValidCollection::INIT_SPACE,
    )]
    pub valid_collection: Account<'info, ValidCollection>,

    pub system_program: Program<'info, System>,
}




#[derive(Accounts)]
pub struct AttackAppearanceFreshness<'info> {

    /// CHECK: validated by OM
    #[account(mut)]
    pub om_config: UncheckedAccount<'info>,

    /// NFT being used
    pub nft_mint: Account<'info, Mint>,

    /// CHECK: Metaplex metadata
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: extracted from metadata
    pub collection_mint: UncheckedAccount<'info>,

    #[account(
        seeds = [FREEPORT_VALID_COLLECTION_SEED, collection_mint.key().as_ref()],
        bump = valid_collection.bump,
        constraint = valid_collection.enabled,
    )]
    pub valid_collection: Account<'info, ValidCollection>,

    /// CHECK: target user
    #[account(mut)]
    pub target_user: UncheckedAccount<'info>,

    pub opinions_market_program: Program<'info, opinions_market::program::OpinionsMarket>,
    pub system_program: Program<'info, System>,
}



/// User deposits from their wallet into the program-controlled vault.
/// Also initializes the program-controlled vault if it doesn't exist.
#[derive(Accounts)]
pub struct DepositNft<'info> {
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

    pub nft_mint: Account<'info, Mint>,

     /// User’s token account holding the NFT (must have amount == 1)
     #[account(
        mut,
        constraint = user_nft_ata.owner == user.key(),
        constraint = user_nft_ata.mint == nft_mint.key(),
    )]
    pub user_nft_ata: Account<'info, TokenAccount>,


     /// CHECK: Metaplex petadata PDA for nft_mint 
     pub metadata: UncheckedAccount<'info>,

     /// CHECK: passed to match metadata.collection.key
      pub collection_mint: UncheckedAccount<'info>,

      #[account(seeds = [FREEPORT_VALID_COLLECTION_SEED, collection_mint.key().as_ref()], bump = valid_collection.bump, constraint = valid_collection.enabled @ ErrorCode::CollectionNotEnabled,
    constraint = valid_collection.allow_deposit @ ErrorCode::CollectionNotAllowedForDeposit,
    )]
    pub valid_collection: Account<'info, ValidCollection>,

    /// CHECK: global authority PDA
    #[account(seeds = [FREEPORT_AUTHORITY_SEED], bump)]
    pub freeport_authority: UncheckedAccount<'info>,
    /// Vault token account that will hold the NFT under program authority
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [FREEPORT_USER_NFT_VAULT_SEED, user.key().as_ref(), nft_mint.key().as_ref()],
        bump,
        token::mint = nft_mint,
        token::authority = freeport_authority,
    )]
    pub freeport_nft_vault: Account<'info, TokenAccount>,


    /// CHECK: Metaplex Token Metadata program
    #[account(address=mpl_token_metadata::ID)]
    pub token_metadata_program: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,  
}



#[derive(Accounts)]
pub struct WithdrawNft<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: Payer for transaction fees (can be user or backend)
    #[account(mut)]
    pub payer: Signer<'info>,


    pub nft_mint: Account<'info, Mint>,

    /// CHECK: metadata to re-validate collection (optional but recommended)
    pub metadata: UncheckedAccount<'info>,
    /// CHECK
    pub collection_mint: UncheckedAccount<'info>,

    #[account(
        seeds = [FREEPORT_VALID_COLLECTION_SEED, collection_mint.key().as_ref()],
        bump = valid_collection.bump,
        constraint = valid_collection.enabled @ ErrorCode::CollectionNotEnabled,
        constraint = valid_collection.allow_withdraw @ ErrorCode::CollectionNotAllowedForWithdrawal,
    )]
    pub valid_collection: Account<'info, ValidCollection>,

    /// Destination token account (can be user ATA, marketplace escrow, etc.)
    #[account(
        mut,
        constraint = dest_token_account.mint == nft_mint.key(),
    )]
    pub dest_token_account: Account<'info, TokenAccount>,

    /// CHECK
    #[account(
        seeds = [FREEPORT_AUTHORITY_SEED],
        bump,
    )]
    pub freeport_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [FREEPORT_USER_NFT_VAULT_SEED, user.key().as_ref(), nft_mint.key().as_ref()],
        bump,
        constraint = freeport_nft_vault.mint == nft_mint.key(),
        constraint = freeport_nft_vault.owner == freeport_authority.key(),
    )]
    pub freeport_nft_vault: Account<'info, TokenAccount>,

    // OPTIONAL (but you will want it): lock PDA to block withdraw while in-use
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [FREEPORT_LOCK_SEED, nft_mint.key().as_ref()],
        bump,
        space = 8 + Lock::INIT_SPACE,
    )]
    pub lock: Account<'info, Lock>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct SendNft<'info> {
    /// CHECK: sender is persona user
    pub sender: UncheckedAccount<'info>,

    /// CHECK: Payer for transaction fees (can be sender or backend)
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: recipient is also persona user
    pub recipient: UncheckedAccount<'info>,

    /// CHECK: persona-owned user account (sender identity)
    #[account(owner = persona::ID)]
    pub sender_user_account: AccountInfo<'info>,

    /// CHECK: session key
    pub session_key: UncheckedAccount<'info>,

    /// CHECK: persona session authority
    #[account(owner = persona::ID)]
    pub session_authority: AccountInfo<'info>,

    pub nft_mint: Account<'info, Mint>,

    /// Canonical entitlement + lock record
    #[account(
        mut,
        seeds = [FREEPORT_LOCK_SEED, nft_mint.key().as_ref()],
        bump = lock.bump,
    )]
    pub lock: Account<'info, Lock>,

    /// CHECK: global authority
    #[account(seeds = [FREEPORT_AUTHORITY_SEED], bump)]
    pub freeport_authority: UncheckedAccount<'info>,

    /// Sender's vault
    #[account(
        mut,
        seeds = [FREEPORT_USER_NFT_VAULT_SEED, sender_user_account.key().as_ref(), nft_mint.key().as_ref()],
        bump,
    )]
    pub sender_vault: Account<'info, TokenAccount>,

    /// Recipient's vault
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [FREEPORT_USER_NFT_VAULT_SEED, recipient.key().as_ref(), nft_mint.key().as_ref()],
        bump,
        token::mint = nft_mint,
        token::authority = freeport_authority,
    )]
    pub recipient_vault: Account<'info, TokenAccount>,

    pub persona_program: Program<'info, persona::program::Persona>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
