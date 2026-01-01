pub fn calc_bling_to_token(bling: u64, token_mint: Pubkey) -> Result<u64> {
    let am = &ctx.accounts.valid_payment;
    let amount_tokens = bling
        .checked_mul(1_000_000) // adjust for mint decimals off-chain ideally
        .ok_or(ErrorCode::MathOverflow)?
        / am.price_in_bling;
    Ok(amount_tokens)
}

pub fn calc_token_to_bling(amount_tokens: u64, token_mint: Pubkey) -> Result<u64> {
    let am = &ctx.accounts.valid_payment;
    let bling = amount_tokens
        .checked_mul(am.price_in_bling)
        .ok_or(ErrorCode::MathOverflow)?
        / 1_000_000;
    Ok(bling)
}
