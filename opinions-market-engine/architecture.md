Nice, this is exactly the right moment to lock in clean primitives.

Below is a **concrete Anchor skeleton** for the MVP model, wired to:

- Use **UserAccount + UserVault** PDAs
- Support **multiple payment mints** but always **denominate the game in BLING**
- Ensure users can **only PUMP/SMACK with pre-deposited funds**
- Allow **withdraw** to be rate-limited / penalized later “based on social interactions”

I’ll keep it minimal but structurally correct so you can grow it.

---

## 1. PDA / account layout (recap)

**Seeds**

- `Config` → `["config"]`
- `AcceptedMint` → `["accepted_mint", mint.key().as_ref()]`
- `UserAccount` → `["user", authority_wallet.key().as_ref()]`
- `VaultAuthority` → `["vault_authority"]`
- `UserVault` → `["vault", user_account.key().as_ref(), mint.key().as_ref()]`
- `PostAccount` → `["post", creator_user_account.key().as_ref(), post_id_hash.as_ref()]`
- `UserPostPosition` → `["position", post.key().as_ref(), user_account.key().as_ref()]`

---

## 2. Anchor program skeleton

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo};

declare_id!("Evi1TW1tt3r111111111111111111111111111111");

#[program]
pub mod evil_twitter {
    use super::*;

    // -------------------------------------------------------------------------
    // CONFIG / ADMIN
    // -------------------------------------------------------------------------

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
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
        Ok(())
    }

    pub fn register_accepted_mint(
        ctx: Context<RegisterAcceptedMint>,
        price_in_bling: u64,
    ) -> Result<()> {
        let am = &mut ctx.accounts.accepted_mint;
        am.mint = ctx.accounts.mint.key();
        am.price_in_bling = price_in_bling; // BLING units per 1 token (fixed rate, predatory)
        am.treasury_token_account = ctx.accounts.treasury_token_account.key();
        am.enabled = true;
        Ok(())
    }

    // -------------------------------------------------------------------------
    // USER + VAULTS
    // -------------------------------------------------------------------------

    pub fn create_user(ctx: Context<CreateUser>) -> Result<()> {
        let user = &mut ctx.accounts.user_account;
        user.authority_wallet = ctx.accounts.authority.key();
        user.social_score = 0; // you can use this later for withdraw penalties
        Ok(())
    }

    pub fn init_user_vault(_ctx: Context<InitUserVault>) -> Result<()> {
        // nothing to do: SPL ATA is created & owned by vault_authority PDA
        Ok(())
    }

    /// User deposits from their wallet into the program-controlled vault.
    pub fn deposit(
        ctx: Context<Deposit>,
        amount: u64,
    ) -> Result<()> {
        // user wallet -> vault token account
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_source.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;
        Ok(())
    }

    /// Withdraw with possible penalty based on social interactions.
    /// You can later implement:
    ///   effective_amount = amount * (10000 - user.withdraw_penalty_bps()) / 10000
    pub fn withdraw(
        ctx: Context<Withdraw>,
        amount: u64,
    ) -> Result<()> {
        let user = &ctx.accounts.user_account;

        // TODO: implement your social-based penalty logic here.
        // For now, just allow full withdrawal.
        let effective_amount = amount;

        let seeds: &[&[&[u8]]] = &[&[
            b"vault_authority",
            &[*ctx.bumps.get("vault_authority").unwrap()],
        ]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.user_destination.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx =
            CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts, seeds);
        token::transfer(cpi_ctx, effective_amount)?;

        Ok(())
    }

    // -------------------------------------------------------------------------
    // POSTS
    // -------------------------------------------------------------------------

    pub fn create_post(
        ctx: Context<CreatePost>,
        post_id_hash: [u8; 32],
    ) -> Result<()> {
        let cfg = &ctx.accounts.config;
        let clock = Clock::get()?;
        let post = &mut ctx.accounts.post;

        post.creator_user = ctx.accounts.creator_user_account.key();
        post.post_id_hash = post_id_hash;
        post.start_time = clock.unix_timestamp;
        post.end_time = clock.unix_timestamp + cfg.base_duration_secs as i64;
        post.state = PostState::Open;
        post.total_pump_bling = 0;
        post.total_smack_bling = 0;
        post.total_pot_bling = 0;
        post.winning_side = None;
        post.payout_per_unit = 0;

        Ok(())
    }

    /// Core MVP voting instruction.
    /// User pays from their vault; everything is denominated in BLING units.
    pub fn vote_on_post(
        ctx: Context<VoteOnPost>,
        side: Side,
        units: u32,        // how many PUMPs or SMACKs (for bonding curve)
        payment_in_bling: bool,
    ) -> Result<()> {
        require!(units > 0, ErrorCode::ZeroUnits);

        let cfg = &ctx.accounts.config;
        let post = &mut ctx.accounts.post;
        let position = &mut ctx.accounts.position;
        let clock = Clock::get()?;

        // 1) Check post is open and within time.
        require!(post.state == PostState::Open, ErrorCode::PostNotOpen);
        require!(clock.unix_timestamp <= post.end_time, ErrorCode::PostExpired);

        // 2) Determine existing count for user.
        let (n_current, smacks_multiplier) = match side {
            Side::Pump => (position.pump_units, 1u64),
            Side::Smack => (position.smack_units, 10u64), // MVP: 1x for pump, 10x for smack
        };

        // 3) Compute incremental BLING cost from linear curve:
        // sum_{k=n+1}^{n+units} k = units*(2n + units + 1)/2
        let n = n_current as u64;
        let u = units as u64;
        let sum_units = u
            .checked_mul(2 * n + u + 1)
            .ok_or(ErrorCode::MathOverflow)?
            / 2;
        let cost_bling = sum_units
            .checked_mul(smacks_multiplier)
            .ok_or(ErrorCode::MathOverflow)?;

        // 4) Take payment either in BLING or via accepted mint (e.g. USDC).
        let mut pot_increment_bling = cost_bling;
        let mut creator_fee_bling = 0u64;
        let mut protocol_fee_bling = 0u64;

        if payment_in_bling {
            // funds already in BLING vault
            // compute fees
            protocol_fee_bling = cost_bling * (cfg.protocol_fee_bps as u64) / 10_000;
            if matches!(side, Side::Pump) {
                creator_fee_bling = cost_bling * (cfg.creator_fee_bps_pump as u64) / 10_000;
            }
            pot_increment_bling = cost_bling
                .checked_sub(protocol_fee_bling + creator_fee_bling)
                .ok_or(ErrorCode::MathOverflow)?;

            // Move BLING from user vault -> pot / creator / protocol
            let seeds: &[&[&[u8]]] = &[&[
                b"vault_authority",
                &[*ctx.bumps.get("vault_authority").unwrap()],
            ]];

            // user vault -> protocol treasury (fee)
            if protocol_fee_bling > 0 {
                let cpi_accounts = Transfer {
                    from: ctx.accounts.user_vault_token_account.to_account_info(),
                    to: ctx.accounts.protocol_bling_treasury.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts,
                    seeds,
                );
                token::transfer(cpi_ctx, protocol_fee_bling)?;
            }

            // user vault -> creator vault (pump only)
            if creator_fee_bling > 0 {
                let cpi_accounts = Transfer {
                    from: ctx.accounts.user_vault_token_account.to_account_info(),
                    to: ctx.accounts.creator_bling_vault.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts,
                    seeds,
                );
                token::transfer(cpi_ctx, creator_fee_bling)?;
            }

            // user vault -> post pot
            let cpi_accounts = Transfer {
                from: ctx.accounts.user_vault_token_account.to_account_info(),
                to: ctx.accounts.post_pot_bling.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                seeds,
            );
            token::transfer(cpi_ctx, pot_increment_bling)?;
        } else {
            // Paying with some other mint (e.g. USDC).
            // 1) Determine BLING equivalent for accounting
            let am = &ctx.accounts.accepted_mint;
            require!(am.enabled, ErrorCode::MintNotEnabled);

            // amount_tokens = cost_bling / price_in_bling
            // (integer division → favourite predatory behaviour)
            let amount_tokens = cost_bling
                .checked_mul(1_000_000) // adjust for mint decimals off-chain ideally
                .ok_or(ErrorCode::MathOverflow)?
                / am.price_in_bling;

            // Move tokens from user vault -> mint treasury
            let seeds: &[&[&[u8]]] = &[&[
                b"vault_authority",
                &[*ctx.bumps.get("vault_authority").unwrap()],
            ]];

            let cpi_accounts = Transfer {
                from: ctx.accounts.user_vault_token_account.to_account_info(),
                to: ctx.accounts.mint_treasury_token_account.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                seeds,
            );
            token::transfer(cpi_ctx, amount_tokens)?;

            // 2) Mint fresh BLING with the same cost_bling,
            // split into protocol / creator / pot the same way.

            protocol_fee_bling = cost_bling * (cfg.protocol_fee_bps as u64) / 10_000;
            if matches!(side, Side::Pump) {
                creator_fee_bling = cost_bling * (cfg.creator_fee_bps_pump as u64) / 10_000;
            }
            pot_increment_bling = cost_bling
                .checked_sub(protocol_fee_bling + creator_fee_bling)
                .ok_or(ErrorCode::MathOverflow)?;

            let bling_mint = &ctx.accounts.bling_mint;
            let bling_seeds: &[&[&[u8]]] = &[&[
                b"bling_mint_authority", // if you wrap mint authority in a PDA; or use admin
                &[*ctx.bumps.get("bling_mint_authority").unwrap()],
            ]];

            // mint protocol fee
            if protocol_fee_bling > 0 {
                let cpi_accounts = MintTo {
                    mint: bling_mint.to_account_info(),
                    to: ctx.accounts.protocol_bling_treasury.to_account_info(),
                    authority: ctx.accounts.bling_mint_authority.to_account_info(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts,
                    bling_seeds,
                );
                token::mint_to(cpi_ctx, protocol_fee_bling)?;
            }

            // mint creator fee
            if creator_fee_bling > 0 {
                let cpi_accounts = MintTo {
                    mint: bling_mint.to_account_info(),
                    to: ctx.accounts.creator_bling_vault.to_account_info(),
                    authority: ctx.accounts.bling_mint_authority.to_account_info(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts,
                    bling_seeds,
                );
                token::mint_to(cpi_ctx, creator_fee_bling)?;
            }

            // mint pot portion
            let cpi_accounts = MintTo {
                mint: bling_mint.to_account_info(),
                to: ctx.accounts.post_pot_bling.to_account_info(),
                authority: ctx.accounts.bling_mint_authority.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                bling_seeds,
            );
            token::mint_to(cpi_ctx, pot_increment_bling)?;
        }

        // 5) Update post and position state.
        match side {
            Side::Pump => {
                post.total_pump_bling = post
                    .total_pump_bling
                    .checked_add(cost_bling)
                    .ok_or(ErrorCode::MathOverflow)?;
                position.pump_units += units;
                position.pump_staked_bling = position
                    .pump_staked_bling
                    .checked_add(cost_bling)
                    .ok_or(ErrorCode::MathOverflow)?;
            }
            Side::Smack => {
                post.total_smack_bling = post
                    .total_smack_bling
                    .checked_add(cost_bling)
                    .ok_or(ErrorCode::MathOverflow)?;
                position.smack_units += units;
                position.smack_staked_bling = position
                    .smack_staked_bling
                    .checked_add(cost_bling)
                    .ok_or(ErrorCode::MathOverflow)?;
            }
        }

        post.total_pot_bling = post
            .total_pot_bling
            .checked_add(pot_increment_bling)
            .ok_or(ErrorCode::MathOverflow)?;

        // 6) Extend time
        let extra_secs = (cfg.extension_per_vote_secs as i64)
            .checked_mul(units as i64)
            .ok_or(ErrorCode::MathOverflow)?;
        let new_end = post.end_time
            .checked_add(extra_secs)
            .ok_or(ErrorCode::MathOverflow)?;
        let max_end = post.start_time + cfg.max_duration_secs as i64;
        post.end_time = new_end.min(max_end);

        Ok(())
    }

    pub fn settle_post(ctx: Context<SettlePost>) -> Result<()> {
        let post = &mut ctx.accounts.post;
        let clock = Clock::get()?;

        require!(post.state == PostState::Open, ErrorCode::PostAlreadySettled);
        require!(clock.unix_timestamp > post.end_time, ErrorCode::PostNotExpired);

        // Choose winner
        let (winner, total_winning_bling) = if post.total_pump_bling > post.total_smack_bling {
            (Side::Pump, post.total_pump_bling)
        } else if post.total_smack_bling > post.total_pump_bling {
            (Side::Smack, post.total_smack_bling)
        } else {
            // tie rule: burn pot, or return? For now, burn to protocol.
            // transfer entire pot to protocol treasury
            let seeds: &[&[&[u8]]] = &[&[
                b"post_pot_authority",
                &[*ctx.bumps.get("post_pot_authority").unwrap()],
            ]];
            let cpi_accounts = Transfer {
                from: ctx.accounts.post_pot_bling.to_account_info(),
                to: ctx.accounts.protocol_bling_treasury.to_account_info(),
                authority: ctx.accounts.post_pot_authority.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                seeds,
            );
            token::transfer(cpi_ctx, post.total_pot_bling)?;
            post.state = PostState::Settled;
            post.winning_side = None;
            post.payout_per_unit = 0;
            return Ok(());
        };

        // MVP distribution:
        // PUMP > SMACK: creator 30%, 70% to PUMPers.
        // SMACK > PUMP: creator 0, 100% to SMACKers.
        let (creator_cut_bps, winners_bps) = match winner {
            Side::Pump => (3000u16, 7000u16),
            Side::Smack => (0u16, 10_000u16),
        };

        let creator_cut = post
            .total_pot_bling
            .checked_mul(creator_cut_bps as u64)
            .ok_or(ErrorCode::MathOverflow)?
            / 10_000;
        let winners_pool = post
            .total_pot_bling
            .checked_sub(creator_cut)
            .ok_or(ErrorCode::MathOverflow)?;

        // move creator cut out of pot now
        if creator_cut > 0 {
            let seeds: &[&[&[u8]]] = &[&[
                b"post_pot_authority",
                &[*ctx.bumps.get("post_pot_authority").unwrap()],
            ]];
            let cpi_accounts = Transfer {
                from: ctx.accounts.post_pot_bling.to_account_info(),
                to: ctx.accounts.creator_bling_vault.to_account_info(),
                authority: ctx.accounts.post_pot_authority.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                seeds,
            );
            token::transfer(cpi_ctx, creator_cut)?;
        }

        // Store per-unit payout so users can claim later.
        // payout_per_unit = winners_pool / total_winning_bling
        let payout_per_unit = if total_winning_bling > 0 {
            winners_pool / total_winning_bling
        } else {
            0
        };

        post.state = PostState::Settled;
        post.winning_side = Some(winner);
        post.payout_per_unit = payout_per_unit;

        Ok(())
    }

    pub fn claim_post_reward(ctx: Context<ClaimPostReward>) -> Result<()> {
        let post = &ctx.accounts.post;
        let position = &mut ctx.accounts.position;

        require!(post.state == PostState::Settled, ErrorCode::PostNotSettled);
        require!(!position.claimed, ErrorCode::AlreadyClaimed);

        let winning_side = post
            .winning_side
            .ok_or(ErrorCode::NoWinner)?;

        let weight = match winning_side {
            Side::Pump => position.pump_staked_bling,
            Side::Smack => position.smack_staked_bling,
        };
        if weight == 0 {
            position.claimed = true;
            return Ok(());
        }

        let reward = weight
            .checked_mul(post.payout_per_unit)
            .ok_or(ErrorCode::MathOverflow)?;

        if reward > 0 {
            let seeds: &[&[&[u8]]] = &[&[
                b"post_pot_authority",
                &[*ctx.bumps.get("post_pot_authority").unwrap()],
            ]];
            let cpi_accounts = Transfer {
                from: ctx.accounts.post_pot_bling.to_account_info(),
                to: ctx.accounts.user_bling_vault.to_account_info(),
                authority: ctx.accounts.post_pot_authority.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                seeds,
            );
            token::transfer(cpi_ctx, reward)?;
        }

        position.claimed = true;
        Ok(())
    }
}

// -----------------------------------------------------------------------------
// ACCOUNTS
// -----------------------------------------------------------------------------

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub bling_mint: Pubkey,
    pub protocol_bling_treasury: Pubkey,
    pub protocol_fee_bps: u16,
    pub creator_fee_bps_pump: u16,
    pub base_duration_secs: u32,
    pub max_duration_secs: u32,
    pub extension_per_vote_secs: u32,
}

#[account]
pub struct AcceptedMint {
    pub mint: Pubkey,
    pub price_in_bling: u64,
    pub treasury_token_account: Pubkey,
    pub enabled: bool,
}

#[account]
pub struct UserAccount {
    pub authority_wallet: Pubkey,
    pub social_score: i64, // can drive withdraw penalty etc.
}

#[account]
pub struct PostAccount {
    pub creator_user: Pubkey,
    pub post_id_hash: [u8; 32],
    pub start_time: i64,
    pub end_time: i64,
    pub state: PostState,
    pub total_pump_bling: u64,
    pub total_smack_bling: u64,
    pub total_pot_bling: u64,
    pub winning_side: Option<Side>,
    pub payout_per_unit: u64, // stored after settle
}

#[account]
pub struct UserPostPosition {
    pub user: Pubkey,
    pub post: Pubkey,
    pub pump_units: u32,
    pub smack_units: u32,
    pub pump_staked_bling: u64,
    pub smack_staked_bling: u64,
    pub claimed: bool,
}

// -----------------------------------------------------------------------------
// ENUMS
// -----------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Side {
    Pump,
    Smack,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PostState {
    Open,
    Settled,
}

// -----------------------------------------------------------------------------
// CONTEXTS
// -----------------------------------------------------------------------------

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        seeds = [b"config"],
        bump,
        space = 8 + 128,
    )]
    pub config: Account<'info, Config>,
    pub bling_mint: Account<'info, Mint>,
    #[account(mut)]
    pub protocol_bling_treasury: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterAcceptedMint<'info> {
    #[account(mut, has_one = admin)]
    pub config: Account<'info, Config>,
    pub admin: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = admin,
        seeds = [b"accepted_mint", mint.key().as_ref()],
        bump,
        space = 8 + 96,
    )]
    pub accepted_mint: Account<'info, AcceptedMint>,
    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateUser<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        seeds = [b"user", authority.key().as_ref()],
        bump,
        space = 8 + 64,
    )]
    pub user_account: Account<'info, UserAccount>,
    pub system_program: Program<'info, System>,
}

/// Create the program-owned vault (ATA) for a given user+mint.
/// authority of the ATA = vault_authority PDA.
#[derive(Accounts)]
pub struct InitUserVault<'info> {
    pub user_account: Account<'info, UserAccount>,
    pub mint: Account<'info, Mint>,
    /// CHECK: PDA just used as token authority
    #[account(
        seeds = [b"vault_authority"],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        token::mint = mint,
        token::authority = vault_authority,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub user_source: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = vault_token_account.owner == vault_authority.key(),
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    /// CHECK
    pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub user_destination: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = vault_token_account.owner == vault_authority.key(),
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    /// CHECK
    #[account(
        seeds = [b"vault_authority"],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CreatePost<'info> {
    pub config: Account<'info, Config>,
    pub creator_user_account: Account<'info, UserAccount>,
    #[account(
        init,
        payer = payer,
        seeds = [b"post", creator_user_account.key().as_ref(), post_id_hash.as_ref()],
        bump,
        space = 8 + 256,
    )]
    pub post: Account<'info, PostAccount>,
    #[account(mut)]
    pub post_pot_bling: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(side: Side, units: u32, payment_in_bling: bool)]
pub struct VoteOnPost<'info> {
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub post: Account<'info, PostAccount>,
    pub user_account: Account<'info, UserAccount>,

    // Per-post per-user position
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [b"position", post.key().as_ref(), user_account.key().as_ref()],
        bump,
        space = 8 + 128,
    )]
    pub position: Account<'info, UserPostPosition>,

    // Payment vault
    #[account(mut)]
    pub user_vault_token_account: Account<'info, TokenAccount>,
    /// CHECK
    #[account(
        seeds = [b"vault_authority"],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    // BLING & fees
    #[account(mut)]
    pub protocol_bling_treasury: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creator_bling_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub post_pot_bling: Account<'info, TokenAccount>,

    // If paying with non-BLING mint
    pub accepted_mint: Option<Account<'info, AcceptedMint>>,
    #[account(mut)]
    pub mint_treasury_token_account: Option<Account<'info, TokenAccount>>,
    pub bling_mint: Option<Account<'info, Mint>>,
    /// CHECK
    pub bling_mint_authority: Option<UncheckedAccount<'info>>,

    #[account(mut)]
    pub payer: Signer<'info>, // your relayer/backend
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettlePost<'info> {
    #[account(mut)]
    pub post: Account<'info, PostAccount>,
    #[account(mut)]
    pub post_pot_bling: Account<'info, TokenAccount>,
    /// CHECK
    #[account(
        seeds = [b"post_pot_authority", post.key().as_ref()],
        bump,
    )]
    pub post_pot_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub creator_bling_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub protocol_bling_treasury: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimPostReward<'info> {
    pub post: Account<'info, PostAccount>,
    #[account(mut)]
    pub position: Account<'info, UserPostPosition>,
    #[account(mut)]
    pub post_pot_bling: Account<'info, TokenAccount>,
    /// CHECK
    #[account(
        seeds = [b"post_pot_authority", post.key().as_ref()],
        bump,
    )]
    pub post_pot_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub user_bling_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

// -----------------------------------------------------------------------------
// ERRORS
// -----------------------------------------------------------------------------

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
}
```

---

This is a lot of code, but structurally it gives you:

- **On-chain user identity** via `UserAccount`
- **Vault-based custody** so users only PUMP/SMACK with **pre-deposited funds**
- **BLING-denominated core game**, with optional **stable deposits** converted to BLING
- **MVP vote → extend time → settle → claim** pipeline
- Obvious hooks to:

  - Change fee splits
  - Add withdraw penalties based on `social_score`
  - Swap PUMP/SMACK price multipliers (1x / 10x) or curve shape

If you want next, I can:

- Sketch the **off-chain flow** (backend + Privy + frontend) step-by-step against these instructions, or
- Strip this into **minimal v0** (only BLING, no multi-mint, no withdraw penalty) to actually ship fast.
