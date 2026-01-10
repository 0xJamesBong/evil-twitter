use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;
use opinions_market::modifiers::effect::*;

pub mod instructions;
pub mod pda_seeds;

use instructions::*;
use pda_seeds::*;

declare_id!("8fFaxfts8bmTt8MaRMKXs1VakW4mXbBnySXyxUExkAdg");

#[program]
pub mod industrial_complex {

    use anchor_lang::solana_program::{ed25519_program, program::invoke};

    use anchor_lang::solana_program::sysvar::instructions::load_instruction_at_checked;

    use super::*;

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
    //     require!(
    //         ctx.accounts.ic_config.pvp_enabled,
    //         ArmouryError::PvPDisabled
    //     );

    //     // 4. Build effect
    //     let effect = ModifierEffect {
    //         category: ModifierCategory::Control,
    //         style: ModifierStyle::Curse,
    //         target: ModifierTarget::User,
    //         field: UserEffectField,
    //     };

    //     Ok(())
    // }
}

#[error_code]
pub enum ErrorCode {
    #[msg("PvP is disabled")]
    PvPDisabled,
}
