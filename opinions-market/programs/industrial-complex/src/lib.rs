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
}

// #[error_code]
// pub enum ErrorCode {}
