use anchor_lang::prelude::*;
use opinions_market::modifiers::effect::PermanentEffect;

/// ItemDefinition represents a type of item that can be purchased.
///
/// Price semantics: `price_dollars` is denominated in Fed's canonical dollar unit
/// and is always charged via Fed CPI. This is NOT a USD mint amount.
///
/// Supply tracking: `minted_count` is necessary because we use a one-mint-per-unit
/// NFT model. Cannot rely on `mint.supply` since each purchase creates a unique mint.
#[account]
#[derive(InitSpace, PartialEq, Eq, Debug)]
pub struct ItemDefinition {
    pub collection: Pubkey, // collection this item belongs to
    pub max_supply: u64,    // maximum number of items of this type that can be minted
    pub minted_count: u64,  // tracks how many have been minted
    pub price_dollars: u64, // price in Fed's canonical dollar unit (always charged via Fed CPI)
    #[max_len(20)]
    pub effects: Vec<PermanentEffect>,
}

impl ItemDefinition {
    pub fn new(
        collection: Pubkey,
        max_supply: u64,
        price_dollars: u64,
        effects: Vec<PermanentEffect>,
    ) -> Self {
        Self {
            collection,
            max_supply,
            minted_count: 0,
            price_dollars,
            effects,
        }
    }
}
