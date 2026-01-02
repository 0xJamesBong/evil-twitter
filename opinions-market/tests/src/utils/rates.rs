pub struct Rates {
    pub sol_to_dollar: u64,
    pub usdc_to_dollar: u64,
}

pub const RATES: Rates = Rates {
    sol_to_dollar: 1_000_000_000,
    usdc_to_dollar: 10_000,
};
