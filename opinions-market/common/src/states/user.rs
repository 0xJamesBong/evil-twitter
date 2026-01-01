// use super::post::PostRelation;
// use super::post::Side;
// use crate::constants::PARAMS;
// use crate::math::vote_cost::{base_user_cost, cost_in_bling, post_curve_cost};
// use anchor_lang::prelude::*;

// // -----------------------------------------------------------------------------
// // USER ACCOUNTS
// // -----------------------------------------------------------------------------

// #[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Copy, PartialEq, Eq, Debug, Clone)]
// pub struct UserAccountAttackSurface {
//     pub enabled: bool,
//     // future:
//     pub surface_1: i16,
//     pub surface_2: i16,
//     pub surface_3: i16,
//     pub surface_4: i16,
//     pub surface_5: i16,
//     pub surface_6: i16,
//     pub surface_7: i16,
//     pub surface_8: i16,
//     pub surface_9: i16,
//     pub padding: [u8; 31],
// }

// impl UserAccountAttackSurface {
//     pub fn new(enabled: bool) -> Self {
//         Self {
//             enabled,
//             surface_1: 10_000,
//             surface_2: 10_000,
//             surface_3: 10_000,
//             surface_4: 10_000,
//             surface_5: 10_000,
//             surface_6: 10_000,
//             surface_7: 10_000,
//             surface_8: 10_000,
//             surface_9: 10_000,
//             padding: [0; 31],
//         }
//     }
// }

// #[account]
// #[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
// pub struct UserAccount {
//     pub user: Pubkey,      // user wallet pubkey
//     pub social_score: i64, // can drive withdraw penalty etc.
//     pub attack_surface: UserAccountAttackSurface,
//     pub bump: u8,
// }

// impl UserAccount {
//     pub fn new(user: Pubkey, bump: u8) -> Self {
//         Self {
//             user,
//             social_score: PARAMS.user_initial_social_score,
//             attack_surface: UserAccountAttackSurface::new(true),
//             bump,
//         }
//     }

//     /// Calculate canonical vote cost for this user
//     /// This is the cost of voting on a "boring" post (0 votes) with no previous votes,
//     /// but using the user's actual social score. This is a pure user attribute.
//     pub fn canonical_cost(&self, side: Side) -> Result<u64> {
//         // Canonical scenario: 1 vote, no previous votes, boring post (0 votes, original type)
//         let base_cost = base_user_cost(
//             1, // 1 vote
//             0, // no previous votes
//             side, self, // user account (for social score)
//         )?;

//         // Apply post curve adjustments (for canonical: 0 votes, original type)
//         let post_cost = post_curve_cost(
//             base_cost,
//             0, // post_upvotes
//             0, // post_downvotes
//             side,
//             PostRelation::Root,
//         )?;

//         // Convert to BLING lamports
//         cost_in_bling(post_cost)
//     }
// }

// #[account]
// #[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
// pub struct UserPostPosition {
//     pub user: Pubkey,
//     pub post: Pubkey,
//     pub upvotes: u64,
//     pub downvotes: u64,
// }

// impl UserPostPosition {
//     pub fn new(user: Pubkey, post: Pubkey) -> Self {
//         Self {
//             user,
//             post,
//             upvotes: 0,
//             downvotes: 0,
//         }
//     }
// }

// // For reward claims - token mint specific
// #[account]
// #[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
// pub struct UserPostMintClaim {
//     pub user: Pubkey,
//     pub post: Pubkey,
//     pub mint: Pubkey,
//     pub claimed: bool,
//     pub bump: u8,
// }

// impl UserPostMintClaim {
//     pub fn new(user: Pubkey, post: Pubkey, mint: Pubkey, bump: u8) -> Self {
//         Self {
//             user,
//             post,
//             mint,
//             claimed: false,
//             bump,
//         }
//     }
// }

// #[account]
// #[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
// pub struct TipVault {
//     pub owner: Pubkey,
//     pub token_mint: Pubkey,
//     pub unclaimed_amount: u64,
//     pub bump: u8,
// }

// impl TipVault {
//     pub fn new(owner: Pubkey, token_mint: Pubkey, bump: u8) -> Self {
//         Self {
//             owner,
//             token_mint,
//             unclaimed_amount: 0,
//             bump,
//         }
//     }
// }
