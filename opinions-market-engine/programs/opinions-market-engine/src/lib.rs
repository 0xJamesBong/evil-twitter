use crate::pda_seeds::*;
use anchor_lang::prelude::*;
pub mod instructions;
pub mod pda_seeds;
pub mod state;
use instructions::*;
use state::*;

declare_id!("8zZcmGeJ6KXSnSyewB7vfLUrYVLfibh6UP3qPujQoeaa");

#[error_code]
pub enum ErrorCode {
    #[msg("Post is not open")]
    PostNotOpen,
    #[msg("Post is expired")]
    PostExpired,
    #[msg("Post already settled")]
    PostAlreadySettled,
    #[msg("Post not yet expired")]
    PostNotExpired,
    #[msg("Post not settled")]
    PostNotSettled,
    #[msg("No winner for this post")]
    NoWinner,
    #[msg("Reward already claimed")]
    AlreadyClaimed,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Zero units not allowed")]
    ZeroUnits,
    #[msg("Mint is not enabled")]
    MintNotEnabled,
    #[msg("BLING cannot be registered as an alternative payment")]
    BlingCannotBeAlternativePayment,
    #[msg("Alternative payment already registered for this mint")]
    AlternativePaymentAlreadyRegistered,
}

#[program]
pub mod opinions_market_engine {
    use super::*;
    // Don't import from instructions module - use re-exports from crate root

    pub fn initialize(
        ctx: Context<Initialize>,
        protocol_fee_bps: u16,
        creator_fee_bps_pump: u16,
    ) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.admin = *ctx.accounts.admin.key;
        cfg.bling_mint = ctx.accounts.bling_mint.key();
        cfg.protocol_bling_treasury = ctx.accounts.protocol_bling_treasury.key();
        cfg.protocol_fee_bps = protocol_fee_bps;
        cfg.creator_fee_bps_pump = creator_fee_bps_pump;
        cfg.base_duration_secs = 24 * 3600;
        cfg.max_duration_secs = 48 * 3600;
        cfg.extension_per_vote_secs = 60;
        cfg.bump = ctx.bumps.config;
        cfg.padding = [0; 7];
        Ok(())
    }

    pub fn register_alternative_payment(
        ctx: Context<RegisterAlternativePayment>,
        price_in_bling: u64, // How much is 1 token in BLING units -
    ) -> Result<()> {
        let cfg = &ctx.accounts.config;

        // Guard: Prevent BLING from being registered as alternative payment
        // (Also enforced by constraint in accounts struct, but adding runtime check for defense-in-depth)
        require!(
            ctx.accounts.token_mint.key() != cfg.bling_mint,
            ErrorCode::BlingCannotBeAlternativePayment
        );

        // Note: Duplicate registration is prevented by the `init` constraint on alternative_payment account.
        // If the account already exists (same PDA seeds), init will fail before this function is called.

        let am = &mut ctx.accounts.alternative_payment;
        am.token_mint = ctx.accounts.token_mint.key();
        am.price_in_bling = price_in_bling;
        am.treasury_token_account = ctx.accounts.treasury_token_account.key();
        am.enabled = true;
        am.bump = ctx.bumps.alternative_payment;
        Ok(())
    }

    // -------------------------------------------------------------------------
    // USER + VAULTS
    // -------------------------------------------------------------------------

    // when the user first signs in, we will need the user to create a user, which will create their deposit vault
    pub fn create_user(ctx: Context<CreateUser>) -> Result<()> {
        let user = &mut ctx.accounts.user_account;
        user.authority_wallet = ctx.accounts.authority.key();
        user.social_score = 0; // you can use this later for withdraw penalties
        user.bump = ctx.bumps.user_account;
        user.padding = [0; 7];
        Ok(())
    }

    /// User deposits from their wallet into the program-controlled vault.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        // Mint is guaranteed to be accepted.
        // accepted_alternative_payment contains price / canonical bling price etc.

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.user_token_ata.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        anchor_spl::token::transfer(cpi_ctx, amount)?;
        Ok(())
    }

    /// Withdraw with possible penalty based on social interactions.
    /// You can later implement:
    ///   effective_amount = amount * (10000 - user.withdraw_penalty_bps()) / 10000
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        // later you’ll put the social penalty logic here
        let effective_amount = amount;

        let seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, &[ctx.bumps.vault_authority]]];

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.user_token_dest_ata.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            seeds,
        );
        anchor_spl::token::transfer(cpi_ctx, effective_amount)?;
        Ok(())
    }

    // -------------------------------------------------------------------------
    // POSTS
    // -------------------------------------------------------------------------

    // pub fn create_post(ctx: Context<CreatePost>, post_id_hash: [u8; 32]) -> Result<()> {
    //     let cfg = &ctx.accounts.config;
    //     let clock = Clock::get()?;
    //     let post = &mut ctx.accounts.post;

    //     post.creator_user = ctx.accounts.creator_user_account.key();
    //     post.post_id_hash = post_id_hash;
    //     post.start_time = clock.unix_timestamp;
    //     post.end_time = clock.unix_timestamp + cfg.base_duration_secs as i64;
    //     post.state = PostState::Open;
    //     post.total_pump_bling = 0;
    //     post.total_smack_bling = 0;
    //     post.total_pot_bling = 0;
    //     post.winning_side = None;
    //     post.payout_per_unit = 0;

    //     Ok(())
    // }

    // /// Core MVP voting instruction.
    // /// User pays from their vault; everything is denominated in BLING units.
    // pub fn vote_on_post(
    //     ctx: Context<VoteOnPost>,
    //     side: Side,
    //     units: u32, // how many PUMPs or SMACKs (for bonding curve)
    //     payment_in_bling: bool,
    // ) -> Result<()> {
    //     require!(units > 0, ErrorCode::ZeroUnits);

    //     let cfg = &ctx.accounts.config;
    //     let post = &mut ctx.accounts.post;
    //     let position = &mut ctx.accounts.position;
    //     let clock = Clock::get()?;

    //     // 1) Check post is open and within time.
    //     require!(post.state == PostState::Open, ErrorCode::PostNotOpen);
    //     require!(
    //         clock.unix_timestamp <= post.end_time,
    //         ErrorCode::PostExpired
    //     );

    //     // 2) Determine existing count for user.
    //     let (n_current, smacks_multiplier) = match side {
    //         Side::Pump => (position.pump_units, 1u64),
    //         Side::Smack => (position.smack_units, 10u64), // MVP: 1x for pump, 10x for smack
    //     };

    //     // 3) Compute incremental BLING cost from linear curve:
    //     // sum_{k=n+1}^{n+units} k = units*(2n + units + 1)/2
    //     let n = n_current as u64;
    //     let u = units as u64;
    //     let sum_units = u
    //         .checked_mul(2 * n + u + 1)
    //         .ok_or(ErrorCode::MathOverflow)?
    //         / 2;
    //     let cost_bling = sum_units
    //         .checked_mul(smacks_multiplier)
    //         .ok_or(ErrorCode::MathOverflow)?;

    //     // 4) Take payment either in BLING or via accepted mint (e.g. USDC).
    //     let mut pot_increment_bling = cost_bling;
    //     let mut creator_fee_bling = 0u64;
    //     let mut protocol_fee_bling = 0u64;

    //     if payment_in_bling {
    //         // funds already in BLING vault
    //         // compute fees
    //         protocol_fee_bling = cost_bling * (cfg.protocol_fee_bps as u64) / 10_000;
    //         if matches!(side, Side::Pump) {
    //             creator_fee_bling = cost_bling * (cfg.creator_fee_bps_pump as u64) / 10_000;
    //         }
    //         pot_increment_bling = cost_bling
    //             .checked_sub(protocol_fee_bling + creator_fee_bling)
    //             .ok_or(ErrorCode::MathOverflow)?;

    //         // Move BLING from user vault -> pot / creator / protocol
    //         let seeds: &[&[&[u8]]] = &[&[b"vault_authority", &[ctx.bumps.vault_authority]]];

    //         // user vault -> protocol treasury (fee)
    //         if protocol_fee_bling > 0 {
    //             let cpi_accounts = anchor_spl::token::Transfer {
    //                 from: ctx.accounts.user_vault_token_account.to_account_info(),
    //                 to: ctx.accounts.protocol_bling_treasury.to_account_info(),
    //                 authority: ctx.accounts.vault_authority.to_account_info(),
    //             };
    //             let cpi_ctx = CpiContext::new_with_signer(
    //                 ctx.accounts.token_program.to_account_info(),
    //                 cpi_accounts,
    //                 seeds,
    //             );
    //             anchor_spl::token::transfer(cpi_ctx, protocol_fee_bling)?;
    //         }

    //         // user vault -> creator vault (pump only)
    //         if creator_fee_bling > 0 {
    //             let cpi_accounts = anchor_spl::token::Transfer {
    //                 from: ctx.accounts.user_vault_token_account.to_account_info(),
    //                 to: ctx.accounts.creator_bling_vault.to_account_info(),
    //                 authority: ctx.accounts.vault_authority.to_account_info(),
    //             };
    //             let cpi_ctx = CpiContext::new_with_signer(
    //                 ctx.accounts.token_program.to_account_info(),
    //                 cpi_accounts,
    //                 seeds,
    //             );
    //             anchor_spl::token::transfer(cpi_ctx, creator_fee_bling)?;
    //         }

    //         // user vault -> post pot
    //         let cpi_accounts = anchor_spl::token::Transfer {
    //             from: ctx.accounts.user_vault_token_account.to_account_info(),
    //             to: ctx.accounts.post_pot_bling.to_account_info(),
    //             authority: ctx.accounts.vault_authority.to_account_info(),
    //         };
    //         let cpi_ctx = CpiContext::new_with_signer(
    //             ctx.accounts.token_program.to_account_info(),
    //             cpi_accounts,
    //             seeds,
    //         );
    //         anchor_spl::token::transfer(cpi_ctx, pot_increment_bling)?;
    //     } else {
    //         // Paying with some other mint (e.g. USDC).
    //         // 1) Determine BLING equivalent for accounting
    //         let am = ctx
    //             .accounts
    //             .accepted_alternative_payment
    //             .as_ref()
    //             .ok_or(ErrorCode::MintNotEnabled)?;
    //         require!(am.enabled, ErrorCode::MintNotEnabled);

    //         // amount_tokens = cost_bling / price_in_bling
    //         // (integer division → favourite predatory behaviour)
    //         let amount_tokens = cost_bling
    //             .checked_mul(1_000_000) // adjust for mint decimals off-chain ideally
    //             .ok_or(ErrorCode::MathOverflow)?
    //             / am.price_in_bling;

    //         // Unwrap Option types
    //         let mint_treasury_token_account = ctx
    //             .accounts
    //             .mint_treasury_token_account
    //             .as_ref()
    //             .ok_or(ErrorCode::MintNotEnabled)?;

    //         // Move tokens from user vault -> mint treasury
    //         let seeds: &[&[&[u8]]] = &[&[b"vault_authority", &[ctx.bumps.vault_authority]]];

    //         let cpi_accounts = anchor_spl::token::Transfer {
    //             from: ctx.accounts.user_vault_token_account.to_account_info(),
    //             to: mint_treasury_token_account.to_account_info(),
    //             authority: ctx.accounts.vault_authority.to_account_info(),
    //         };
    //         let cpi_ctx = CpiContext::new_with_signer(
    //             ctx.accounts.token_program.to_account_info(),
    //             cpi_accounts,
    //             seeds,
    //         );
    //         anchor_spl::token::transfer(cpi_ctx, amount_tokens)?;

    //         // 2) Mint fresh BLING with the same cost_bling,
    //         // split into protocol / creator / pot the same way.

    //         protocol_fee_bling = cost_bling * (cfg.protocol_fee_bps as u64) / 10_000;
    //         if matches!(side, Side::Pump) {
    //             creator_fee_bling = cost_bling * (cfg.creator_fee_bps_pump as u64) / 10_000;
    //         }
    //         pot_increment_bling = cost_bling
    //             .checked_sub(protocol_fee_bling + creator_fee_bling)
    //             .ok_or(ErrorCode::MathOverflow)?;

    //         // Unwrap Option types - these should be Some when payment_in_bling is false
    //         let bling_mint = ctx
    //             .accounts
    //             .bling_mint
    //             .as_ref()
    //             .ok_or(ErrorCode::MintNotEnabled)?;
    //         let bling_mint_authority = ctx
    //             .accounts
    //             .bling_mint_authority
    //             .as_ref()
    //             .ok_or(ErrorCode::MintNotEnabled)?;

    //         // Derive the bump for bling_mint_authority PDA (not initialized, so not in ctx.bumps)
    //         let (_, bump) =
    //             Pubkey::find_program_address(&[b"bling_mint_authority"], ctx.program_id);
    //         let bling_seeds: &[&[&[u8]]] = &[&[b"bling_mint_authority", &[bump]]];

    //         // mint protocol fee
    //         if protocol_fee_bling > 0 {
    //             let cpi_accounts = anchor_spl::token::MintTo {
    //                 mint: bling_mint.to_account_info(),
    //                 to: ctx.accounts.protocol_bling_treasury.to_account_info(),
    //                 authority: bling_mint_authority.to_account_info(),
    //             };
    //             let cpi_ctx = CpiContext::new_with_signer(
    //                 ctx.accounts.token_program.to_account_info(),
    //                 cpi_accounts,
    //                 bling_seeds,
    //             );
    //             anchor_spl::token::mint_to(cpi_ctx, protocol_fee_bling)?;
    //         }

    //         // mint creator fee
    //         if creator_fee_bling > 0 {
    //             let cpi_accounts = anchor_spl::token::MintTo {
    //                 mint: bling_mint.to_account_info(),
    //                 to: ctx.accounts.creator_bling_vault.to_account_info(),
    //                 authority: bling_mint_authority.to_account_info(),
    //             };
    //             let cpi_ctx = CpiContext::new_with_signer(
    //                 ctx.accounts.token_program.to_account_info(),
    //                 cpi_accounts,
    //                 bling_seeds,
    //             );
    //             anchor_spl::token::mint_to(cpi_ctx, creator_fee_bling)?;
    //         }

    //         // mint pot portion
    //         let cpi_accounts = anchor_spl::token::MintTo {
    //             mint: bling_mint.to_account_info(),
    //             to: ctx.accounts.post_pot_bling.to_account_info(),
    //             authority: bling_mint_authority.to_account_info(),
    //         };
    //         let cpi_ctx = CpiContext::new_with_signer(
    //             ctx.accounts.token_program.to_account_info(),
    //             cpi_accounts,
    //             bling_seeds,
    //         );
    //         anchor_spl::token::mint_to(cpi_ctx, pot_increment_bling)?;
    //     }

    //     // 5) Update post and position state.
    //     match side {
    //         Side::Pump => {
    //             post.total_pump_bling = post
    //                 .total_pump_bling
    //                 .checked_add(cost_bling)
    //                 .ok_or(ErrorCode::MathOverflow)?;
    //             position.pump_units += units;
    //             position.pump_staked_bling = position
    //                 .pump_staked_bling
    //                 .checked_add(cost_bling)
    //                 .ok_or(ErrorCode::MathOverflow)?;
    //         }
    //         Side::Smack => {
    //             post.total_smack_bling = post
    //                 .total_smack_bling
    //                 .checked_add(cost_bling)
    //                 .ok_or(ErrorCode::MathOverflow)?;
    //             position.smack_units += units;
    //             position.smack_staked_bling = position
    //                 .smack_staked_bling
    //                 .checked_add(cost_bling)
    //                 .ok_or(ErrorCode::MathOverflow)?;
    //         }
    //     }

    //     post.total_pot_bling = post
    //         .total_pot_bling
    //         .checked_add(pot_increment_bling)
    //         .ok_or(ErrorCode::MathOverflow)?;

    //     // 6) Extend time
    //     let extra_secs = (cfg.extension_per_vote_secs as i64)
    //         .checked_mul(units as i64)
    //         .ok_or(ErrorCode::MathOverflow)?;
    //     let new_end = post
    //         .end_time
    //         .checked_add(extra_secs)
    //         .ok_or(ErrorCode::MathOverflow)?;
    //     let max_end = post.start_time + cfg.max_duration_secs as i64;
    //     post.end_time = new_end.min(max_end);

    //     Ok(())
    // }

    // pub fn settle_post(ctx: Context<SettlePost>) -> Result<()> {
    //     // Get post key before mutable borrow
    //     let post_key = ctx.accounts.post.key();
    //     let post = &mut ctx.accounts.post;
    //     let clock = Clock::get()?;

    //     require!(post.state == PostState::Open, ErrorCode::PostAlreadySettled);
    //     require!(
    //         clock.unix_timestamp > post.end_time,
    //         ErrorCode::PostNotExpired
    //     );

    //     // Choose winner
    //     let (winner, total_winning_bling) = if post.total_pump_bling > post.total_smack_bling {
    //         (Side::Pump, post.total_pump_bling)
    //     } else if post.total_smack_bling > post.total_pump_bling {
    //         (Side::Smack, post.total_smack_bling)
    //     } else {
    //         // tie rule: burn pot, or return? For now, burn to protocol.
    //         //anchor_spl::token::Transfer entire pot to protocol treasury
    //         // Derive the bump for post_pot_authority PDA (not initialized, so not in ctx.bumps)
    //         let (_, bump) = Pubkey::find_program_address(
    //             &[b"post_pot_authority", post_key.as_ref()],
    //             ctx.program_id,
    //         );
    //         let seeds: &[&[&[u8]]] = &[&[b"post_pot_authority", post_key.as_ref(), &[bump]]];
    //         let cpi_accounts = anchor_spl::token::Transfer {
    //             from: ctx.accounts.post_pot_bling.to_account_info(),
    //             to: ctx.accounts.protocol_bling_treasury.to_account_info(),
    //             authority: ctx.accounts.post_pot_authority.to_account_info(),
    //         };
    //         let cpi_ctx = CpiContext::new_with_signer(
    //             ctx.accounts.token_program.to_account_info(),
    //             cpi_accounts,
    //             seeds,
    //         );
    //         anchor_spl::token::transfer(cpi_ctx, post.total_pot_bling)?;
    //         post.state = PostState::Settled;
    //         post.winning_side = None;
    //         post.payout_per_unit = 0;
    //         return Ok(());
    //     };

    //     // MVP distribution:
    //     // PUMP > SMACK: creator 30%, 70% to PUMPers.
    //     // SMACK > PUMP: creator 0, 100% to SMACKers.
    //     let (creator_cut_bps, winners_bps) = match winner {
    //         Side::Pump => (3000u16, 7000u16),
    //         Side::Smack => (0u16, 10_000u16),
    //     };

    //     let creator_cut = post
    //         .total_pot_bling
    //         .checked_mul(creator_cut_bps as u64)
    //         .ok_or(ErrorCode::MathOverflow)?
    //         / 10_000;
    //     let winners_pool = post
    //         .total_pot_bling
    //         .checked_sub(creator_cut)
    //         .ok_or(ErrorCode::MathOverflow)?;

    //     // move creator cut out of pot now
    //     if creator_cut > 0 {
    //         // Derive the bump for post_pot_authority PDA (not initialized, so not in ctx.bumps)
    //         // Get post key - post is already mutably borrowed above, so we can't access it here
    //         // We need to get it before the mutable borrow or use the already-borrowed reference
    //         let post_key_for_seeds = post.key();
    //         let (_, bump) = Pubkey::find_program_address(
    //             &[b"post_pot_authority", post_key_for_seeds.as_ref()],
    //             ctx.program_id,
    //         );
    //         let seeds: &[&[&[u8]]] =
    //             &[&[b"post_pot_authority", post_key_for_seeds.as_ref(), &[bump]]];
    //         let cpi_accounts = anchor_spl::token::Transfer {
    //             from: ctx.accounts.post_pot_bling.to_account_info(),
    //             to: ctx.accounts.creator_bling_vault.to_account_info(),
    //             authority: ctx.accounts.post_pot_authority.to_account_info(),
    //         };
    //         let cpi_ctx = CpiContext::new_with_signer(
    //             ctx.accounts.token_program.to_account_info(),
    //             cpi_accounts,
    //             seeds,
    //         );
    //         anchor_spl::token::transfer(cpi_ctx, creator_cut)?;
    //     }

    //     // Store per-unit payout so users can claim later.
    //     // payout_per_unit = winners_pool / total_winning_bling
    //     let payout_per_unit = if total_winning_bling > 0 {
    //         winners_pool / total_winning_bling
    //     } else {
    //         0
    //     };

    //     post.state = PostState::Settled;
    //     post.winning_side = Some(winner);
    //     post.payout_per_unit = payout_per_unit;

    //     Ok(())
    // }

    // pub fn claim_post_reward(ctx: Context<ClaimPostReward>) -> Result<()> {
    //     let post = &ctx.accounts.post;
    //     let position = &mut ctx.accounts.position;

    //     require!(post.state == PostState::Settled, ErrorCode::PostNotSettled);
    //     require!(!position.claimed, ErrorCode::AlreadyClaimed);

    //     let winning_side = post.winning_side.ok_or(ErrorCode::NoWinner)?;

    //     let weight = match winning_side {
    //         Side::Pump => position.pump_staked_bling,
    //         Side::Smack => position.smack_staked_bling,
    //     };
    //     if weight == 0 {
    //         position.claimed = true;
    //         return Ok(());
    //     }

    //     let reward = weight
    //         .checked_mul(post.payout_per_unit)
    //         .ok_or(ErrorCode::MathOverflow)?;

    //     if reward > 0 {
    //         // Derive the bump for post_pot_authority PDA (not initialized, so not in ctx.bumps)
    //         let post_key = ctx.accounts.post.key();
    //         let (_, bump) = Pubkey::find_program_address(
    //             &[b"post_pot_authority", post_key.as_ref()],
    //             ctx.program_id,
    //         );
    //         let seeds: &[&[&[u8]]] = &[&[b"post_pot_authority", post_key.as_ref(), &[bump]]];
    //         let cpi_accounts = anchor_spl::token::Transfer {
    //             from: ctx.accounts.post_pot_bling.to_account_info(),
    //             to: ctx.accounts.user_bling_vault.to_account_info(),
    //             authority: ctx.accounts.post_pot_authority.to_account_info(),
    //         };
    //         let cpi_ctx = CpiContext::new_with_signer(
    //             ctx.accounts.token_program.to_account_info(),
    //             cpi_accounts,
    //             seeds,
    //         );
    //         anchor_spl::token::transfer(cpi_ctx, reward)?;
    //     }

    //     position.claimed = true;
    //     Ok(())
    // }
}
