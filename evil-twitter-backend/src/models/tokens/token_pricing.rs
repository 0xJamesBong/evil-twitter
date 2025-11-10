use crate::models::tokens::enums::TokenType;

#[derive(Debug, Clone, Copy)]
pub struct PriceRatio {
    pub token_units: i64,
    pub usdc_units: i64,
}

impl PriceRatio {
    pub fn new(token_units: i64, usdc_units: i64) -> Self {
        Self {
            token_units,
            usdc_units,
        }
    }
    pub fn to_usdc(&self, token_amount: i64) -> i64 {
        token_amount * self.usdc_units / self.token_units
    }

    pub fn from_usdc(&self, usdc_amount: i64) -> i64 {
        usdc_amount * self.token_units / self.usdc_units
    }

    pub fn apply_spread(&self, bias: f64) -> Self {
        let new_usdc = (self.usdc_units as f64 * bias).round() as i64;
        Self::new(self.token_units, new_usdc)
    }
}

#[derive(Debug, Clone, Copy)]
pub struct PriceEntry {
    pub ratio: PriceRatio,
    pub spread: f64, // e.g. 0.02 = 2% spread
}

impl PriceEntry {
    pub fn new(ratio: PriceRatio, spread: f64) -> Self {
        Self { ratio, spread }
    }

    pub fn buy_ratio(&self) -> PriceRatio {
        self.ratio.apply_spread(1.0 + self.spread)
    }

    pub fn sell_ratio(&self) -> PriceRatio {
        self.ratio.apply_spread(1.0 - self.spread)
    }
}

pub struct Prices {
    pub dooler: PriceEntry,
    pub usdc: PriceEntry,
    pub bling: PriceEntry,
    pub sol: PriceEntry,
}

impl Prices {
    pub fn new() -> Self {
        Self {
            dooler: PriceEntry::new(PriceRatio::new(1, 1), 0.01),
            usdc: PriceEntry::new(PriceRatio::new(1, 1), 0.02),
            bling: PriceEntry::new(PriceRatio::new(100000, 1), 0.5),
            sol: PriceEntry::new(PriceRatio::new(1, 700), 0.5),
        }
    }
    pub fn usdc_to_token(&self, token_type: TokenType, amount: i64) -> i64 {
        match token_type {
            TokenType::Dooler => self.dooler.buy_ratio().from_usdc(amount),
            TokenType::Usdc => amount,
            TokenType::Bling => self.bling.buy_ratio().from_usdc(amount),
            TokenType::Sol => self.sol.buy_ratio().from_usdc(amount),
        }
    }
    pub fn token_to_usdc(&self, token_type: TokenType, amount: i64) -> i64 {
        match token_type {
            TokenType::Dooler => self.dooler.sell_ratio().to_usdc(amount),
            TokenType::Usdc => amount,
            TokenType::Bling => self.bling.sell_ratio().to_usdc(amount),
            TokenType::Sol => self.sol.sell_ratio().to_usdc(amount),
        }
    }
}
