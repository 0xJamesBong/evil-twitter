use crate::models::tokens::enums::TokenType;
use crate::models::tokens::token_pricing::Prices;

pub fn exchange(from_token: TokenType, to_token: TokenType, amount: i64) -> i64 {
    let prices = Prices::new();

    if from_token == to_token {
        return amount;
    } else if from_token == TokenType::Usdc {
        return prices.usdc_to_token(to_token, amount);
    } else if to_token == TokenType::Usdc {
        return prices.token_to_usdc(from_token, amount);
    } else {
        let usdc_value = prices.token_to_usdc(from_token, amount);
        return prices.usdc_to_token(to_token, usdc_value);
    }
}
