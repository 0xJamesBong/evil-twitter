pub fn calc_dollar_to_token(dollar: u64, token_mint: Pubkey) -> Result<u64> {
    let am = &ctx.accounts.valid_payment;
    let amount_tokens = dollar
        .checked_mul(1_000_000) // adjust for mint decimals off-chain ideally
        .ok_or(ErrorCode::MathOverflow)?
        / am.price_in_dollar;
    Ok(amount_tokens)
}

pub fn calc_token_to_dollar(amount_tokens: u64, token_mint: Pubkey) -> Result<u64> {
    let am = &ctx.accounts.valid_payment;
    let dollar = amount_tokens
        .checked_mul(am.price_in_dollar)
        .ok_or(ErrorCode::MathOverflow)?
        / 1_000_000;
    Ok(dollar)
}
