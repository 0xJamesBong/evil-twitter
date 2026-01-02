// use crate::ErrorCode;
// use anchor_lang::prelude::*;

// /// BLING always has 9 decimals
// pub const BLING_DECIMALS: u8 = 9;

// /// USDC and Stablecoin have 6 decimals
// pub const USDC_DECIMALS: u8 = 6;
// pub const STABLECOIN_DECIMALS: u8 = 6;

// /// Convert BLING lamports to token lamports using ValidPayment price
// ///
// /// # Arguments
// /// * `bling_lamports` - Amount in BLING lamports (9 decimals)
// /// * `price_in_dollar` - Price from ValidPayment: how many dollars (base units) = 1 token (base units)
// ///   Example: if 1 USDC = 1 dollar, then price_in_dollar = 1
// /// * `token_decimals` - Number of decimals for the target token (e.g., 6 for USDC, 9 for BLING)
// ///
// /// # Formula
// /// token_lamports = (dollar_lamports * 10^token_decimals) / (price_in_dollar * 10^dollar_decimals)
// ///
// /// # Returns
// /// Amount in token lamports, or MathOverflow error
// pub fn convert_dollar_to_token_lamports(
//     dollar_lamports: u64,
//     price_in_dollar: u64,
//     token_decimals: u8,
// ) -> Result<u64> {
//     // If converting to a token with same decimals and price of 1, no conversion needed
//     if token_decimals == DOLLAR_DECIMALS && price_in_dollar == 1 {
//         return Ok(dollar_lamports);
//     }

//     // Conversion formula: token_lamports = (dollar_lamports * 10^token_decimals) / (price_in_dollar * 10^dollar_decimals)
//     // price_in_dollar is in base units (lamport-free), so we need to account for decimals

//     let numerator = dollar_lamports
//         .checked_mul(10u64.pow(token_decimals as u32))
//         .ok_or_else(|| Error::from(ErrorCode::MathOverflow))?;

//     let denominator = price_in_dollar
//         .checked_mul(10u64.pow(DOLLAR_DECIMALS as u32))
//         .ok_or_else(|| Error::from(ErrorCode::MathOverflow))?;

//     numerator
//         .checked_div(denominator)
//         .ok_or_else(|| Error::from(ErrorCode::MathOverflow))
// }

// /// Convert dollar lamports to USDC lamports
// ///
// /// # Arguments
// /// * `dollar_lamports` - Amount in DOLLAR lamports (9 decimals)
// /// * `price_in_dollar` - Price from ValidPayment: how many dollars (base units) = 1 USDC (base units)
// ///
// /// # Example
// /// If 1 USDC = 1 dollar and you have 2 dollars (2_000_000_000 lamports):
// /// convert_dollar_to_usdc(2_000_000_000, 1) = 2_000_000_000 USDC lamports (2 USDC)
// pub fn convert_dollar_to_usdc_lamports(dollar_lamports: u64, price_in_dollar: u64) -> Result<u64> {
//     convert_dollar_to_token_lamports(dollar_lamports, price_in_dollar, USDC_DECIMALS)
// }

// /// Convert dollar lamports to Stablecoin lamports
// ///
// /// # Arguments
// /// * `dollar_lamports` - Amount in DOLLAR lamports (9 decimals)
// /// * `price_in_dollar` - Price from ValidPayment: how many dollars (base units) = 1 Stablecoin (base units)
// ///
// /// # Example
// /// If 1 Stablecoin = 1 dollar and you have 2 dollars (2_000_000_000 lamports):
// /// convert_dollar_to_stablecoin(2_000_000_000, 1) = 2_000_000_000 Stablecoin lamports (2 Stablecoin)
// pub fn convert_dollar_to_stablecoin_lamports(
//     dollar_lamports: u64,
//     price_in_dollar: u64,
// ) -> Result<u64> {
//     convert_dollar_to_token_lamports(dollar_lamports, price_in_dollar, STABLECOIN_DECIMALS)
// }

// #[cfg(test)]
// mod tests {
//     use super::*;

//     #[test]
//     fn test_convert_dollar_to_usdc() {
//         // Test: 2 DOLLAR = 2_000_000_000 lamports
//         // If 1 USDC = 1 dollar, then 2 dollars = 2 USDC = 2_000_000 USDC lamports
//         let dollar_lamports = 2_000_000_000u64; // 2 DOLLAR
//         let price_in_dollar = 1u64; // 1 USDC = 1 dollar
//         let result = convert_dollar_to_usdc_lamports(dollar_lamports, price_in_dollar).unwrap();
//         assert_eq!(result, 2_000_000u64); // 2 USDC = 2_000_000 lamports (6 decimals)
//     }

//     #[test]
//     fn test_convert_dollar_to_dollar() {
//         // Converting dollar to a token with same decimals and price of 1 should return the same amount
//         let dollar_lamports = 1_000_000_000u64; // 1 DOLLAR
//         let price_in_dollar = 1u64; // 1 token = 1 dollar
//         let result =
//             convert_dollar_to_token_lamports(dollar_lamports, price_in_dollar, DOLLAR_DECIMALS)
//                 .unwrap();
//         assert_eq!(result, dollar_lamports);
//     }
// }
