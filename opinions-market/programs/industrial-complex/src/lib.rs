use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;
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
        let signer_seeds: &[&[&[u8]]] = &[&[ISSUE_AUTHORITY_SEED, &[bump]]];

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

    pub fn create_item_definition(
        ctx: Context<CreateItemDefinition>,
        effects: Vec<PermanentEffect>,
        total_supply: u64,
    ) -> Result<()> {
        let item = &mut ctx.accounts.item_definition;
        item.collection = ctx.accounts.collection.key();
        item.total_supply = total_supply;
        item.effects = effects;
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
}
