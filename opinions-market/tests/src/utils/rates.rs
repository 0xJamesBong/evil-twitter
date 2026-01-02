pub struct Rates {
    pub sol_to_dollar: u64,
    pub usdc_to_dollar: u64,
    pub stablecoin_to_dollar: u64,
    pub bling_to_dollar: u64,
}

pub const RATES: Rates = Rates {
    // sol_to_bling: 1_000_000_000,
    // usdc_to_bling: 10_000,
    sol_to_dollar: 400,
    usdc_to_dollar: 1,
    stablecoin_to_dollar: 1,
    bling_to_dollar: 1,
};
