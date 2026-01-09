// use crate::pda_seeds::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;

pub mod instructions;

use instructions::*;
// use states::*;

declare_id!("8fFaxfts8bmTt8MaRMKXs1VakW4mXbBnySXyxUExkAdg");

#[program]
pub mod industrial_complex {

    use anchor_lang::solana_program::{ed25519_program, program::invoke};

    use anchor_lang::solana_program::sysvar::instructions::load_instruction_at_checked;

    use super::*;
    pub fn design_nft() -> Result<()>;

    pub fn buy_nft() -> Result<()>;
    pub fn deposit_nft() -> Result<()>;
    pub fn withdraw_nft() -> Result<()>;

    pub fn use_nft(ctx: Context<AttackVoter>, target: Pubkey) -> Result<()> {
        // 1. Verify attack owns weapons NFT
        verify_nft(&ctx.accounts.weapon_nft, &ctx.accounts.attacker)?;

        // 2. Check cooldown / charges
        enforce_cooldown();

        // 3. Enforce PvP rules
        require!(
            ctx.accounts.ic_config.pvp_enabled,
            ArmouryError::PvPDisabled
        );

        // 4. Build effect
        let effect = ModifierEffect {
            category: ModifierCategory::Control,
            style: ModifierStyle::Curse,
            target: ModifierTarget::User,
            field: UserEffectField,
        };

        Ok(())
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("PvP is disabled")]
    PvPDisabled,
}
