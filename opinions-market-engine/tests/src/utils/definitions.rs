pub struct Rates {
    pub sol_to_bling: u64,
    pub usdc_to_bling: u64,
}

pub const RATES: Rates = Rates {
    sol_to_bling: 1_000_000_000,
    usdc_to_bling: 10_000,
};
