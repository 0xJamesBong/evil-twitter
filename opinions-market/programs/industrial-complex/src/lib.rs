use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;
use mpl_token_metadata::{
    instructions::{CreateV1CpiBuilder, MintV1CpiBuilder},
    types::{Collection, CollectionDetails, PrintSupply, TokenStandard},
};
use opinions_market::modifiers::effect::*;

pub mod instructions;
pub mod pda_seeds;
pub mod states;

use instructions::*;
use pda_seeds::*;
use states::*;

declare_id!("8fFaxfts8bmTt8MaRMKXs1VakW4mXbBnySXyxUExkAdg");

#[program]
pub mod industrial_complex {

    use anchor_lang::solana_program::{ed25519_program, program::invoke};

    use anchor_lang::solana_program::sysvar::instructions::load_instruction_at_checked;

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let cfg = &mut ctx.accounts.ic_config;

        let new_cfg = IcConfig::new(*ctx.accounts.admin.key, ctx.bumps.ic_config, [0; 7]);

        cfg.admin = new_cfg.admin;
        cfg.bump = new_cfg.bump;
        cfg.padding = new_cfg.padding;

        Ok(())
    }

    /// Attacks a user's appearance freshness by applying a permanent curse effect.
    pub fn attack_appearance_freshness(
        ctx: Context<AttackAppearanceFreshness>,
        magnitude: i16,
    ) -> Result<()> {
        // Build the permanent effect
        let effect = PermanentEffect {
            category: PermanentEffectCategory::Control,
            style: PermanentEffectStyle::Curse,
            target: PermanentEffectTarget::User,
            stack_rule: StackRule::Subtract,
            field: UserEffectField::AppearanceFreshness,
            magnitude,
        };

        // IC PDA signs the CPI to apply the mutation
        let bump = ctx.bumps.issue_authority;
        let signer_seeds: &[&[&[u8]]] = &[&[IC_ISSUE_AUTHORITY_SEED, &[bump]]];

        opinions_market::cpi::apply_mutation(
            CpiContext::new_with_signer(
                ctx.accounts.opinions_market_program.to_account_info(),
                opinions_market::cpi::accounts::ApplyMutation {
                    om_config: ctx.accounts.om_config.to_account_info(),
                    target_user: ctx.accounts.target_user.to_account_info(),
                    target_user_voter_account: ctx
                        .accounts
                        .target_user_voter_account
                        .to_account_info(),
                    issue_authority: ctx.accounts.issue_authority.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
                signer_seeds,
            ),
            effect,
        )?;

        Ok(())
    }

    /// CreateItemDefinition - Creates both the collection NFT and the item definition atomically.
    /// The collection is part of the item type identity and must be created together with the item definition.
    /// This ensures proper lifecycle management and prevents non-atomic creation issues.
    pub fn create_item_definition(
        ctx: Context<CreateItemDefinition>,
        effects: Vec<PermanentEffect>,
        max_supply: u64,
        price_dollars: u64,
        collection_name: String,
        collection_symbol: String,
        collection_uri: String,
    ) -> Result<()> {
        // 1. Create the collection NFT first
        let payer_info = ctx.accounts.payer.to_account_info();
        let mint_info = ctx.accounts.collection_mint.to_account_info();
        let metadata_info = ctx.accounts.collection_metadata.to_account_info();
        let master_edition_info = ctx.accounts.collection_master_edition.to_account_info();
        let system_program_info = ctx.accounts.system_program.to_account_info();
        let token_program_info = ctx.accounts.token_program.to_account_info();
        let sysvar_instructions_info = ctx.accounts.sysvar_instructions.to_account_info();
        let token_metadata_program_info = ctx.accounts.token_metadata_program.to_account_info();

        let mut create_cpi = CreateV1CpiBuilder::new(&token_metadata_program_info);

        create_cpi
            .metadata(&metadata_info)
            .master_edition(Some(&master_edition_info))
            .mint(&mint_info, false)
            .authority(&payer_info)
            .payer(&payer_info)
            .update_authority(&payer_info, true)
            .system_program(&system_program_info)
            .sysvar_instructions(&sysvar_instructions_info)
            .spl_token_program(Some(&token_program_info))
            .name(collection_name)
            .symbol(collection_symbol)
            .uri(collection_uri)
            .seller_fee_basis_points(0)
            .token_standard(TokenStandard::NonFungible)
            .collection_details(CollectionDetails::V1 { size: 0 }) // marks this mint as a COLLECTION NFT
            .print_supply(PrintSupply::Zero);

        create_cpi.invoke()?;

        // 2. Initialize the item definition with the collection mint key
        let item = &mut ctx.accounts.item_definition;
        item.collection = ctx.accounts.collection_mint.key();
        item.max_supply = max_supply;
        item.minted_count = 0;
        item.price_dollars = price_dollars;
        item.effects = effects;

        Ok(())
    }

    /// BuyItem - Purchase an item that gets minted as a unique NFT stored in IC vault.
    /// Strict ordering: validate supply -> charge payment -> create mint -> create metadata -> mint to vault -> increment count
    pub fn buy_item(
        ctx: Context<BuyItem>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        let item_def = &mut ctx.accounts.item_definition;

        // 1. Validate supply (CRITICAL: must be first)
        require!(
            item_def.minted_count < item_def.max_supply,
            ErrorCode::ItemSoldOut
        );

        // 2. Validate collection matches
        require!(
            item_def.collection == ctx.accounts.collection_mint.key(),
            ErrorCode::InvalidCollection
        );

        // 3. Payment via Fed CPI (CRITICAL: must happen before minting)
        fed::cpi::convert_dollar_and_charge_to_protocol_treasury(
            CpiContext::new(
                ctx.accounts.fed_program.to_account_info(),
                fed::cpi::accounts::ConvertDollarAndChargeToProtocolTreasury {
                    user: ctx.accounts.fed_user.to_account_info(),
                    from_user_vault_token_account: ctx
                        .accounts
                        .from_user_vault_token_account
                        .to_account_info(),
                    protocol_treasury_token_account: ctx
                        .accounts
                        .protocol_treasury_token_account
                        .to_account_info(),
                    valid_payment: ctx.accounts.valid_payment.to_account_info(),
                    token_mint: ctx.accounts.token_mint.to_account_info(),
                    fed_config: ctx.accounts.fed_config.to_account_info(),
                    vault_authority: ctx.accounts.fed_vault_authority.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                },
            ),
            item_def.price_dollars,
        )?;

        // 4. Create metadata using CreateV1CpiBuilder
        let payer_info = ctx.accounts.payer.to_account_info();
        let mint_info = ctx.accounts.mint.to_account_info();
        let metadata_info = ctx.accounts.metadata.to_account_info();
        let master_edition_info = ctx.accounts.master_edition.to_account_info();
        let collection_mint_info = ctx.accounts.collection_mint.to_account_info();
        let system_program_info = ctx.accounts.system_program.to_account_info();
        let token_program_info = ctx.accounts.token_program.to_account_info();
        let sysvar_instructions_info = ctx.accounts.sysvar_instructions.to_account_info();
        let token_metadata_program_info = ctx.accounts.token_metadata_program.to_account_info();

        let mut create_cpi = CreateV1CpiBuilder::new(&token_metadata_program_info);

        create_cpi
            .metadata(&metadata_info)
            .master_edition(Some(&master_edition_info))
            .mint(&mint_info, true) // mint is signer in this ix
            .authority(&payer_info)
            .payer(&payer_info)
            .update_authority(&payer_info, true)
            .system_program(&system_program_info)
            .sysvar_instructions(&sysvar_instructions_info)
            .spl_token_program(Some(&token_program_info))
            .name(name)
            .symbol(symbol)
            .uri(uri)
            .seller_fee_basis_points(0)
            .token_standard(TokenStandard::NonFungible)
            .print_supply(PrintSupply::Zero)
            .collection(Collection {
                key: collection_mint_info.key(),
                verified: false,
            });

        create_cpi.invoke()?;

        // 5. Mint NFT to user's IC vault token account (signed by IC vault authority)
        let vault_authority_bump = ctx.bumps.ic_vault_authority;
        let vault_authority_seeds: &[&[&[u8]]] =
            &[&[IC_TOKEN_VAULT_AUTHORITY_SEED, &[vault_authority_bump]]];

        let ata_info = ctx.accounts.user_nft_vault_token_account.to_account_info();
        let associated_token_program_info = ctx.accounts.associated_token_program.to_account_info();
        let ic_vault_authority_info = ctx.accounts.ic_vault_authority.to_account_info();

        let mut mint_cpi = MintV1CpiBuilder::new(&token_metadata_program_info);

        mint_cpi
            .token(&ata_info)
            .token_owner(Some(&payer_info))
            .metadata(&metadata_info)
            .master_edition(Some(&master_edition_info))
            .mint(&mint_info)
            .payer(&payer_info)
            .authority(&ic_vault_authority_info)
            .system_program(&system_program_info)
            .sysvar_instructions(&sysvar_instructions_info)
            .spl_token_program(&token_program_info)
            .spl_ata_program(&associated_token_program_info)
            .amount(1);

        mint_cpi.invoke_signed(vault_authority_seeds)?;

        // 6. Update minted_count (CRITICAL: only after mint succeeds)
        item_def.minted_count = item_def
            .minted_count
            .checked_add(1)
            .ok_or(ErrorCode::ItemSoldOut)?;

        Ok(())
    }

    /// WithdrawItem - Transfer NFT from IC vault to user's wallet.
    /// Policy: NFTs are freely withdrawable. Ownership ≠ activation. Using an item requires custody in IC vault.
    pub fn withdraw_item(ctx: Context<WithdrawItem>) -> Result<()> {
        // Validate user owns at least 1 NFT in vault
        require!(
            ctx.accounts.user_nft_vault_token_account.amount >= 1,
            ErrorCode::InvalidNFT
        );

        // Transfer from IC vault to user's ATA
        let vault_authority_bump = ctx.bumps.ic_vault_authority;
        let vault_authority_seeds: &[&[&[u8]]] =
            &[&[IC_TOKEN_VAULT_AUTHORITY_SEED, &[vault_authority_bump]]];

        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.user_nft_vault_token_account.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.ic_vault_authority.to_account_info(),
                },
                vault_authority_seeds,
            ),
            1, // Transfer 1 NFT
        )?;

        Ok(())
    }

    // pub fn mint_item(ctx: Context<MintItem>) -> Result<()> {
    //     let item = &mut ctx.accounts.item_definition;

    //     // Mint exactly 1 NFT
    //     token::mint_to(
    //         CpiContext::new(
    //             ctx.accounts.token_program.to_account_info(),
    //             MintTo {
    //                 mint: ctx.accounts.mint.to_account_info(),
    //                 to: ctx.accounts.user_token_account.to_account_info(),
    //                 authority: ctx.accounts.mint_authority.to_account_info(),
    //             },
    //         ),
    //         1,
    //     )?;

    //     item.total_supply = item.total_supply.checked_add(1).unwrap();
    //     Ok(())
    // }

    // pub fn deposit_item(ctx: Context<DepositItem>) -> Result<()> {
    //     token::transfer(
    //         CpiContext::new(
    //             ctx.accounts.token_program.to_account_info(),
    //             Transfer {
    //                 from: ctx.accounts.user_token_account.to_account_info(),
    //                 to: ctx.accounts.vault_token_account.to_account_info(),
    //                 authority: ctx.accounts.user.to_account_info(),
    //             },
    //         ),
    //         1,
    //     )?;
    //     Ok(())
    // }

    // pub fn withdraw_item(ctx: Context<WithdrawItem>) -> Result<()> {
    //     let bump = ctx.bumps.vault_authority;
    //     let signer_seeds: &[&[&[u8]]] = &[&[ITEM_VAULT_SEED, &[bump]]];

    //     token::transfer(
    //         CpiContext::new_with_signer(
    //             ctx.accounts.token_program.to_account_info(),
    //             Transfer {
    //                 from: ctx.accounts.vault_token_account.to_account_info(),
    //                 to: ctx.accounts.user_token_account.to_account_info(),
    //                 authority: ctx.accounts.vault_authority.to_account_info(),
    //             },
    //             signer_seeds,
    //         ),
    //         1,
    //     )?;

    //     Ok(())
    // }

    // pub fn use_item_on_user(ctx: Context<UseItemOnUser>) -> Result<()> {
    //     // 1. Prove caller owns NFT
    //     require!(ctx.accounts.nft_token.amount == 1, ErrorCode::InvalidNFT);
    //     require!(
    //         ctx.accounts.nft_token.owner == ctx.accounts.user.key(),
    //         ErrorCode::NotOwner
    //     );

    //     // 2. Load effects from item definition
    //     let effects = ctx.accounts.item_definition.effects.clone();

    //     // 3. Sign CPI as IC
    //     let bump = ctx.bumps.issue_authority;
    //     let signer_seeds: &[&[&[u8]]] = &[&[ISSUE_AUTHORITY_SEED, &[bump]]];

    //     // 4. Emit ALL effects
    //     for effect in effects {
    //         opinions_market::cpi::apply_mutation(
    //             CpiContext::new_with_signer(
    //                 ctx.accounts.opinions_market_program.to_account_info(),
    //                 opinions_market::cpi::accounts::ApplyMutation {
    //                     om_config: ctx.accounts.om_config.to_account_info(),
    //                     target_user: ctx.accounts.target_user.to_account_info(),
    //                     target_user_voter_account: ctx
    //                         .accounts
    //                         .target_user_voter_account
    //                         .to_account_info(),
    //                     issue_authority: ctx.accounts.issue_authority.to_account_info(),
    //                     system_program: ctx.accounts.system_program.to_account_info(),
    //                 },
    //                 signer_seeds,
    //             ),
    //             effect,
    //         )?;
    //     }

    //     Ok(())
    // }
}

#[error_code]
pub enum ErrorCode {
    #[msg("PvP is disabled")]
    PvPDisabled,
    #[msg("Invalid NFT")]
    InvalidNFT,
    #[msg("Not owner")]
    NotOwner,
    #[msg("Not IC admin")]
    NotIcAdmin,
    #[msg("Item sold out")]
    ItemSoldOut,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Invalid collection")]
    InvalidCollection,
}
