use anchor_lang::prelude::*;

pub mod pda_seeds;

#[error_code]
pub enum CommonError {
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Invalid parameter")]
    InvalidParameter,
}
