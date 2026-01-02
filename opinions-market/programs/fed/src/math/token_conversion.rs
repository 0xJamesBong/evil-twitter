use crate::ErrorCode;
use anchor_lang::prelude::*;

/// DOLLAR always has 9 decimals
pub const DOLLAR_DECIMALS: u8 = 9;

/// BLING always has 9 decimals
pub const BLING_DECIMALS: u8 = 9;

/// USDC and Stablecoin have 6 decimals
pub const USDC_DECIMALS: u8 = 6;
pub const STABLECOIN_DECIMALS: u8 = 6;

/// Convert dollar lamports to token lamports using ValidPayment price
///
/// # Arguments
/// * `dollar_lamports` - Amount in DOLLAR lamports (9 decimals)
/// * `price_in_dollar` - Price from ValidPayment: how many dollar (base units) = 1 token (base units)
///   Example: if 1 USDC = 1 DOLLAR, then price_in_dollar = 1
///   If 1 BLING token = 10000 DOLLAR, then price_in_dollar = 10000
/// * `token_decimals` - Number of decimals for the target token (e.g., 6 for USDC, 9 for BLING)
///
/// # Formula
/// token_lamports = (dollar_lamports * 10^token_decimals) / (price_in_dollar * 10^dollar_decimals)
///
/// # Returns
/// Amount in token lamports, or MathOverflow error
pub fn convert_dollar_to_token_lamports(
    dollar_lamports: u64,
    price_in_dollar: u64,
    token_decimals: u8,
) -> Result<u64> {
    // If converting to a token with same decimals and price of 1, no conversion needed
    if token_decimals == DOLLAR_DECIMALS && price_in_dollar == 1 {
        return Ok(dollar_lamports);
    }

    // Conversion formula: token_lamports = (dollar_lamports * 10^token_decimals) / (price_in_dollar * 10^dollar_decimals)
    // price_in_dollar is in base units (lamport-free), so we need to account for decimals

    let numerator = dollar_lamports
        .checked_mul(10u64.pow(token_decimals as u32))
        .ok_or_else(|| Error::from(ErrorCode::MathOverflow))?;

    let denominator = price_in_dollar
        .checked_mul(10u64.pow(DOLLAR_DECIMALS as u32))
        .ok_or_else(|| Error::from(ErrorCode::MathOverflow))?;

    numerator
        .checked_div(denominator)
        .ok_or_else(|| Error::from(ErrorCode::MathOverflow))
}

/// Convert dollar lamports to USDC lamports
///
/// # Arguments
/// * `dollar_lamports` - Amount in DOLLAR lamports (9 decimals)
/// * `price_in_dollar` - Price from ValidPayment: how many dollars (base units) = 1 USDC (base units)
///
/// # Example
/// If 1 USDC = 1 DOLLAR and you have 2 DOLLAR (2_000_000_000 lamports):
/// convert_dollar_to_usdc(2_000_000_000, 1) = 2_000_000_000 USDC lamports (2 USDC)
pub fn convert_dollar_to_usdc_lamports(dollar_lamports: u64, price_in_dollar: u64) -> Result<u64> {
    convert_dollar_to_token_lamports(dollar_lamports, price_in_dollar, USDC_DECIMALS)
}

/// Convert dollar lamports to Stablecoin lamports
///
/// # Arguments
/// * `dollar_lamports` - Amount in DOLLAR lamports (9 decimals)
/// * `price_in_dollar` - Price from ValidPayment: how many dollars (base units) = 1 Stablecoin (base units)
///
/// # Example
/// If 1 Stablecoin = 1 DOLLAR and you have 2 DOLLAR (2_000_000_000 lamports):
/// convert_dollar_to_stablecoin(2_000_000_000, 1) = 2_000_000_000 Stablecoin lamports (2 Stablecoin)
pub fn convert_dollar_to_stablecoin_lamports(
    dollar_lamports: u64,
    price_in_dollar: u64,
) -> Result<u64> {
    convert_dollar_to_token_lamports(dollar_lamports, price_in_dollar, STABLECOIN_DECIMALS)
}

/// Convert multiple dollar amounts to token amounts
///
/// Useful for converting protocol_fee, creator_fee, and pot_increment all at once
///
/// # Arguments
/// * `protocol_fee_dollar` - Protocol fee in DOLLAR lamports
/// * `creator_fee_dollar` - Creator fee in DOLLAR lamports
/// * `pot_increment_dollar` - Pot increment in DOLLAR lamports
/// * `price_in_dollar` - Price from ValidPayment: how many dollars (base units) = 1 token (base units)
/// * `token_decimals` - Target token decimals
///
/// # Returns
/// Tuple of (protocol_fee_token, creator_fee_token, pot_increment_token) in token lamports
pub fn convert_dollar_fees_to_token(
    protocol_fee_dollar: u64,
    creator_fee_dollar: u64,
    pot_increment_dollar: u64,
    price_in_dollar: u64,
    token_decimals: u8,
) -> Result<(u64, u64, u64)> {
    Ok((
        convert_dollar_to_token_lamports(protocol_fee_dollar, price_in_dollar, token_decimals)?,
        convert_dollar_to_token_lamports(creator_fee_dollar, price_in_dollar, token_decimals)?,
        convert_dollar_to_token_lamports(pot_increment_dollar, price_in_dollar, token_decimals)?,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_convert_dollar_to_usdc() {
        // Test: 2 DOLLAR = 2_000_000_000 lamports
        // If 1 USDC = 1 DOLLAR, then 2 DOLLAR = 2 USDC = 2_000_000 USDC lamports
        let dollar_lamports = 2_000_000_000u64; // 2 DOLLAR
        let price_in_dollar = 1u64; // 1 USDC = 1 DOLLAR
        let result = convert_dollar_to_usdc_lamports(dollar_lamports, price_in_dollar).unwrap();
        assert_eq!(result, 2_000_000u64); // 2 USDC = 2_000_000 lamports (6 decimals)
    }

    #[test]
    fn test_convert_dollar_to_dollar() {
        // Converting DOLLAR to a token with same decimals and price of 1 should return the same amount
        let dollar_lamports = 1_000_000_000u64; // 1 DOLLAR
        let price_in_dollar = 1u64; // 1 token = 1 DOLLAR
        let result =
            convert_dollar_to_token_lamports(dollar_lamports, price_in_dollar, DOLLAR_DECIMALS)
                .unwrap();
        assert_eq!(result, dollar_lamports);
    }

    #[test]
    fn test_convert_fees() {
        // Test converting multiple fees at once
        let protocol_fee = 100_000_000u64; // 0.1 DOLLAR
        let creator_fee = 100_000_000u64; // 0.1 DOLLAR
        let pot_increment = 1_800_000_000u64; // 1.8 DOLLAR
        let price_in_dollar = 1u64; // 1 USDC = 1 DOLLAR

        let (protocol_token, creator_token, pot_token) = convert_dollar_fees_to_token(
            protocol_fee,
            creator_fee,
            pot_increment,
            price_in_dollar,
            USDC_DECIMALS,
        )
        .unwrap();

        // 0.1 DOLLAR / 1 = 0.1 USDC = 100_000 lamports
        assert_eq!(protocol_token, 100_000u64);
        assert_eq!(creator_token, 100_000u64);
        // 1.8 DOLLAR / 1 = 1.8 USDC = 1_800_000 lamports
        assert_eq!(pot_token, 1_800_000u64);
    }
}
