use crate::ErrorCode;
use anchor_lang::prelude::*;

/// BLING always has 9 decimals
pub const BLING_DECIMALS: u8 = 9;

/// USDC and Stablecoin have 6 decimals
pub const USDC_DECIMALS: u8 = 6;
pub const STABLECOIN_DECIMALS: u8 = 6;

/// Convert BLING lamports to token lamports using ValidPayment price
///
/// # Arguments
/// * `bling_lamports` - Amount in BLING lamports (9 decimals)
/// * `price_in_bling` - Price from ValidPayment: how many BLING (base units) = 1 token (base units)
///   Example: if 1 USDC = 10,000 BLING, then price_in_bling = 10_000
/// * `token_decimals` - Number of decimals for the target token (e.g., 6 for USDC, 9 for BLING)
///
/// # Formula
/// token_lamports = (bling_lamports * 10^token_decimals) / (price_in_bling * 10^bling_decimals)
///
/// # Returns
/// Amount in token lamports, or MathOverflow error
pub fn convert_bling_to_token_lamports(
    bling_lamports: u64,
    price_in_bling: u64,
    token_decimals: u8,
) -> Result<u64> {
    // If converting to BLING, no conversion needed
    if token_decimals == BLING_DECIMALS && price_in_bling == 1 {
        return Ok(bling_lamports);
    }

    // Conversion formula: token_lamports = (bling_lamports * 10^token_decimals) / (price_in_bling * 10^bling_decimals)
    // price_in_bling is in base units (lamport-free), so we need to account for decimals

    let numerator = bling_lamports
        .checked_mul(10u64.pow(token_decimals as u32))
        .ok_or_else(|| Error::from(ErrorCode::MathOverflow))?;

    let denominator = price_in_bling
        .checked_mul(10u64.pow(BLING_DECIMALS as u32))
        .ok_or_else(|| Error::from(ErrorCode::MathOverflow))?;

    numerator
        .checked_div(denominator)
        .ok_or_else(|| Error::from(ErrorCode::MathOverflow))
}

/// Convert BLING lamports to USDC lamports
///
/// # Arguments
/// * `bling_lamports` - Amount in BLING lamports (9 decimals)
/// * `price_in_bling` - Price from ValidPayment: how many BLING (base units) = 1 USDC (base units)
///
/// # Example
/// If 1 USDC = 10,000 BLING and you have 2 BLING (2_000_000_000 lamports):
/// convert_bling_to_usdc(2_000_000_000, 10_000) = 200 USDC lamports (0.0002 USDC)
pub fn convert_bling_to_usdc_lamports(bling_lamports: u64, price_in_bling: u64) -> Result<u64> {
    convert_bling_to_token_lamports(bling_lamports, price_in_bling, USDC_DECIMALS)
}

/// Convert BLING lamports to Stablecoin lamports
///
/// # Arguments
/// * `bling_lamports` - Amount in BLING lamports (9 decimals)
/// * `price_in_bling` - Price from ValidPayment: how many BLING (base units) = 1 Stablecoin (base units)
///
/// # Example
/// If 1 Stablecoin = 10,000 BLING and you have 2 BLING (2_000_000_000 lamports):
/// convert_bling_to_stablecoin(2_000_000_000, 10_000) = 200 Stablecoin lamports (0.0002 Stablecoin)
pub fn convert_bling_to_stablecoin_lamports(
    bling_lamports: u64,
    price_in_bling: u64,
) -> Result<u64> {
    convert_bling_to_token_lamports(bling_lamports, price_in_bling, STABLECOIN_DECIMALS)
}

/// Convert multiple BLING amounts to token amounts
///
/// Useful for converting protocol_fee, creator_fee, and pot_increment all at once
///
/// # Arguments
/// * `protocol_fee_bling` - Protocol fee in BLING lamports
/// * `creator_fee_bling` - Creator fee in BLING lamports
/// * `pot_increment_bling` - Pot increment in BLING lamports
/// * `price_in_bling` - Price from ValidPayment
/// * `token_decimals` - Target token decimals
///
/// # Returns
/// Tuple of (protocol_fee_token, creator_fee_token, pot_increment_token) in token lamports
pub fn convert_bling_fees_to_token(
    protocol_fee_bling: u64,
    creator_fee_bling: u64,
    pot_increment_bling: u64,
    price_in_bling: u64,
    token_decimals: u8,
) -> Result<(u64, u64, u64)> {
    Ok((
        convert_bling_to_token_lamports(protocol_fee_bling, price_in_bling, token_decimals)?,
        convert_bling_to_token_lamports(creator_fee_bling, price_in_bling, token_decimals)?,
        convert_bling_to_token_lamports(pot_increment_bling, price_in_bling, token_decimals)?,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_convert_bling_to_usdc() {
        // Test: 2 BLING = 2_000_000_000 lamports
        // If 1 USDC = 10,000 BLING, then 2 BLING = 0.0002 USDC = 200 USDC lamports
        let bling_lamports = 2_000_000_000u64; // 2 BLING
        let price_in_bling = 10_000u64; // 1 USDC = 10,000 BLING
        let result = convert_bling_to_usdc_lamports(bling_lamports, price_in_bling).unwrap();
        assert_eq!(result, 200u64); // 0.0002 USDC = 200 lamports (6 decimals)
    }

    #[test]
    fn test_convert_bling_to_bling() {
        // Converting BLING to BLING should return the same amount
        let bling_lamports = 1_000_000_000u64; // 1 BLING
        let price_in_bling = 1u64; // 1 BLING = 1 BLING
        let result =
            convert_bling_to_token_lamports(bling_lamports, price_in_bling, BLING_DECIMALS)
                .unwrap();
        assert_eq!(result, bling_lamports);
    }

    #[test]
    fn test_convert_fees() {
        // Test converting multiple fees at once
        let protocol_fee = 100_000_000u64; // 0.1 BLING
        let creator_fee = 100_000_000u64; // 0.1 BLING
        let pot_increment = 1_800_000_000u64; // 1.8 BLING
        let price_in_bling = 10_000u64; // 1 USDC = 10,000 BLING

        let (protocol_token, creator_token, pot_token) = convert_bling_fees_to_token(
            protocol_fee,
            creator_fee,
            pot_increment,
            price_in_bling,
            USDC_DECIMALS,
        )
        .unwrap();

        // 0.1 BLING / 10,000 = 0.00001 USDC = 10 lamports
        assert_eq!(protocol_token, 10u64);
        assert_eq!(creator_token, 10u64);
        // 1.8 BLING / 10,000 = 0.00018 USDC = 180 lamports
        assert_eq!(pot_token, 180u64);
    }
}
