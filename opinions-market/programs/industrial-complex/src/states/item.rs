use anchor_lang::prelude::*;
use opinions_market::modifiers::effect::PermanentEffect;

#[account]
#[derive(InitSpace, PartialEq, Eq, Debug)]
pub struct ItemDefinition {
    pub collection: Pubkey, // collection this item belongs to
    pub total_supply: u64,
    #[max_len(20)]
    pub effects: Vec<PermanentEffect>,
}

impl ItemDefinition {
    pub fn new(collection: Pubkey, total_supply: u64, effects: Vec<PermanentEffect>) -> Self {
        Self {
            collection,
            total_supply,
            effects,
        }
    }
}
