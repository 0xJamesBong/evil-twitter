use crate::pda_seeds::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;
pub mod constants;
pub mod instructions;
pub mod pda_seeds;
pub mod state;
use constants::*;
use instructions::*;
use state::*;

declare_id!("4z5rjroGdWmgGX13SdFsh4wRM4jJkMUrcvYrNpV3gezm");

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
    #[msg("Unauthorized: user account does not belong to the payer")]
    Unauthorized,
    #[msg("Invalid parent post")]
    InvalidParentPost,
}
#[derive(Accounts)]
pub struct Ping {}

#[program]
pub mod opinions_market {
    use super::*;
    // Don't import from instructions module - use re-exports from crate root
    pub fn ping(ctx: Context<Ping>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        panic!("SHIT");
        Ok(())
    }
    pub fn initialize(
        ctx: Context<Initialize>,

        base_duration_secs: u32,
        max_duration_secs: u32,
        extension_per_vote_secs: u32,
    ) -> Result<()> {
        let cfg = &mut ctx.accounts.config;

        let new_cfg = Config::new(
            *ctx.accounts.admin.key,
            ctx.accounts.bling_mint.key(),
            base_duration_secs,
            max_duration_secs,
            extension_per_vote_secs,
            ctx.bumps.config,
            [0; 7],
        );

        cfg.admin = new_cfg.admin;
        cfg.bling_mint = new_cfg.bling_mint;

        cfg.base_duration_secs = new_cfg.base_duration_secs;
        cfg.max_duration_secs = new_cfg.max_duration_secs;
        cfg.extension_per_vote_secs = new_cfg.extension_per_vote_secs;

        cfg.bump = new_cfg.bump;
        cfg.padding = new_cfg.padding;

        let valid_payment = &mut ctx.accounts.valid_payment;

        let new_valid_payment = ValidPayment::new(ctx.accounts.bling_mint.key(), 1, true);

        valid_payment.token_mint = new_valid_payment.token_mint;
        valid_payment.price_in_bling = new_valid_payment.price_in_bling;
        valid_payment.enabled = new_valid_payment.enabled;
        valid_payment.bump = ctx.bumps.valid_payment; // Use the actual bump from Anchor

        Ok(())
    }

    pub fn register_valid_payment(
        ctx: Context<RegisterValidPayment>,
        price_in_bling: u64, // How much is 1 token in BLING units -
    ) -> Result<()> {
        let cfg = &ctx.accounts.config;

        // Note: Duplicate registration is prevented by the `init` constraint on alternative_payment account.
        // If the account already exists (same PDA seeds), init will fail before this function is called.

        let valid_payment = &mut ctx.accounts.valid_payment;
        let new_valid_payment =
            ValidPayment::new(ctx.accounts.token_mint.key(), price_in_bling, true);

        valid_payment.token_mint = new_valid_payment.token_mint;
        valid_payment.price_in_bling = new_valid_payment.price_in_bling;
        valid_payment.enabled = new_valid_payment.enabled;
        valid_payment.bump = ctx.bumps.valid_payment; // Use the actual bump from Anchor

        Ok(())
    }

    // -------------------------------------------------------------------------
    // USER + VAULTS
    // -------------------------------------------------------------------------

    // when the user first signs in, we will need the user to create a user, which will create their deposit vault
    pub fn create_user(ctx: Context<CreateUser>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let user_account = &mut ctx.accounts.user_account;
        let new_user_account = UserAccount::new(ctx.accounts.user.key(), ctx.bumps.user_account);

        user_account.user = new_user_account.user;
        user_account.social_score = new_user_account.social_score;
        user_account.bump = new_user_account.bump;

        Ok(())
    }

    /// User deposits from their wallet into the program-controlled vault.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        // No logic needed—Anchor already checked mint is allowed.
        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.user_token_ata.to_account_info(),
            to: ctx.accounts.user_vault_token_account.to_account_info(),
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

        let vault_bump = ctx.bumps.vault_authority;
        let seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, &[vault_bump]]];

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.user_vault_token_account.to_account_info(),
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

    pub fn create_post(
        ctx: Context<CreatePost>,
        post_id_hash: [u8; 32],
        parent_post_pda: Option<Pubkey>,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let config = &ctx.accounts.config;
        let now = clock.unix_timestamp;
        let post = &mut ctx.accounts.post;
        let new_post = PostAccount::new(
            ctx.accounts.user.key(),
            post_id_hash,
            match parent_post_pda {
                Some(parent_pda) => PostType::Child { parent: parent_pda },
                None => PostType::Original,
            },
            now,
            config,
        );

        post.creator_user = new_post.creator_user;
        post.post_id_hash = new_post.post_id_hash;
        post.post_type = new_post.post_type;
        post.start_time = new_post.start_time;
        post.end_time = new_post.end_time;
        post.state = new_post.state;
        post.upvotes = new_post.upvotes;
        post.downvotes = new_post.downvotes;
        post.winning_side = new_post.winning_side;

        Ok(())
    }

    /// Core MVP voting instruction.
    /// User pays from their vault; everything is denominated in BLING units.

    pub fn vote_on_post(
        ctx: Context<VoteOnPost>,
        side: Side,
        units: u32,
        post_id_hash: [u8; 32], // do not remove this - this is used to derive the post pda!
    ) -> Result<()> {
        require!(units > 0, ErrorCode::ZeroUnits);

        let cfg = &ctx.accounts.config;
        let post = &mut ctx.accounts.post;

        let clock = Clock::get()?;

        msg!("clock.unix_timestamp: {}", clock.unix_timestamp);
        msg!("post.end_time: {}", post.end_time);

        require!(post.state == PostState::Open, ErrorCode::PostNotOpen);
        require!(
            post.within_time_limit(clock.unix_timestamp),
            ErrorCode::PostExpired
        );

        // Handle position
        let pos = &mut ctx.accounts.position;
        if pos.user == Pubkey::default() {
            let new_pos = UserPostPosition::new(ctx.accounts.voter.key(), post.key());
            pos.user = new_pos.user;
            pos.post = new_pos.post;
            pos.upvotes = new_pos.upvotes;
            pos.downvotes = new_pos.downvotes;
        }

        //
        // ---- 1. Compute BLING cost ----
        //

        let vote = Vote::new(side, units, ctx.accounts.voter.key(), post.key());
        let cost_bling =
            vote.compute_cost_in_bling(post, pos, &ctx.accounts.voter_user_account, cfg)?;

        msg!("cost_bling: {}", cost_bling);
        msg!("post.upvotes BEFORE: {}", post.upvotes);

        let protocol_fee = cost_bling * (PARAMS.protocol_vote_fee_bps as u64) / 10_000;
        let creator_pump_fee = match side {
            Side::Pump => cost_bling * (PARAMS.creator_pump_fee_bps as u64) / 10_000,
            Side::Smack => 0,
        };

        let pot_increment = cost_bling
            .checked_sub(protocol_fee + creator_pump_fee)
            .ok_or(ErrorCode::MathOverflow)?;

        //
        // ---- 2. TRANSFERS (ALWAYS IN token_mint) ----
        //

        let vault_bump = ctx.bumps.vault_authority;
        let user_authority_seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, &[vault_bump]]];

        // protocol fee
        if protocol_fee > 0 {
            anchor_spl::token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx
                            .accounts
                            .voter_user_vault_token_account
                            .to_account_info(),
                        to: ctx
                            .accounts
                            .protocol_token_treasury_token_account
                            .to_account_info(),
                        authority: ctx.accounts.vault_authority.to_account_info(),
                    },
                    user_authority_seeds,
                ),
                protocol_fee,
            )?;
        }

        // creator fee
        if creator_pump_fee > 0 {
            anchor_spl::token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx
                            .accounts
                            .voter_user_vault_token_account
                            .to_account_info(),
                        to: ctx.accounts.creator_vault_token_account.to_account_info(),
                        authority: ctx.accounts.vault_authority.to_account_info(),
                    },
                    user_authority_seeds,
                ),
                creator_pump_fee,
            )?;
        }

        // pot increment
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx
                        .accounts
                        .voter_user_vault_token_account
                        .to_account_info(),
                    to: ctx.accounts.post_pot_token_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                user_authority_seeds,
            ),
            pot_increment,
        )?;

        //
        // ---- 3. UPDATE COUNTERS ----
        //

        match side {
            Side::Pump => {
                post.upvotes = post
                    .upvotes
                    .checked_add(cost_bling)
                    .ok_or(ErrorCode::MathOverflow)?;
                pos.upvotes += units;
            }
            Side::Smack => {
                post.downvotes = post
                    .downvotes
                    .checked_add(cost_bling)
                    .ok_or(ErrorCode::MathOverflow)?;
                pos.downvotes += units;
            }
        }

        // Extend post duration
        let ext = (cfg.extension_per_vote_secs as i64)
            .checked_mul(units as i64)
            .ok_or(ErrorCode::MathOverflow)?;

        post.end_time = post
            .end_time
            .checked_add(ext)
            .unwrap()
            .min(post.start_time + cfg.max_duration_secs as i64);

        Ok(())
    }

    // This is token mint specific - to settle the pots for all tokens, chain all the
    //instructions together, each parametrized by individual token mints, and send it
    // off in one transaction.
    // Naturally this means we cannot require the PostState to be open, we only require it to be past the settlement time.
    pub fn settle_post(ctx: Context<SettlePost>) -> Result<()> {
        let post = &mut ctx.accounts.post;

        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        msg!("clock.unix_timestamp: {}", clock.unix_timestamp);
        msg!("post.end_time: {}", post.end_time);

        // * * * * this must not be adopted.
        // * * * * require!(post.state == PostState::Open, ErrorCode::PostNotOpen);
        // If still within time limit, exit early.
        // if (post.within_time_limit(now)) {
        //     msg!("Post is still within time limit, not doing anything and exiting early!");
        //     return Ok(());
        // }

        // Determine winner — ties and zero votes = Pump side wins
        let (winner, total_winning_votes) = match post.upvotes.cmp(&post.downvotes) {
            std::cmp::Ordering::Greater => (Side::Pump, post.upvotes),
            std::cmp::Ordering::Less => (Side::Smack, post.downvotes),
            std::cmp::Ordering::Equal => (Side::Pump, post.upvotes), // tie → Pump wins
        };
        let pot_amount = ctx.accounts.post_pot_token_account.amount;

        // payout_per_winning_vote guards against 0
        let payout_per_winning_vote = if total_winning_votes == 0 {
            0 as u64
        } else {
            pot_amount
                .checked_mul(PRECISION) // scale up to avoid division by 0
                .unwrap()
                .checked_div(total_winning_votes)
                .ok_or(ErrorCode::MathOverflow)?
        };

        // Save payout snapshot for claims
        let payout = &mut ctx.accounts.post_mint_payout;
        let new_payout = PostMintPayout::new(
            post.key(),
            ctx.accounts.token_mint.key(),
            pot_amount,
            payout_per_winning_vote,
            ctx.bumps.post_mint_payout,
        );

        payout.post = new_payout.post;
        payout.token_mint = new_payout.token_mint;
        payout.total_payout = new_payout.total_payout;
        payout.payout_per_winning_vote = new_payout.payout_per_winning_vote;
        payout.bump = new_payout.bump;

        if post.state == PostState::Open {
            post.state = PostState::Settled;
        }
        if post.winning_side.is_none() {
            post.winning_side = Some(winner);
        }

        require!(post.state == PostState::Settled, ErrorCode::PostNotSettled);

        Ok(())
    }

    pub fn claim_post_reward(ctx: Context<ClaimPostReward>) -> Result<()> {
        let post = &ctx.accounts.post;
        let pos = &mut ctx.accounts.position;
        let claim = &mut ctx.accounts.user_post_mint_claim;

        require!(post.state == PostState::Settled, ErrorCode::PostNotSettled);
        require!(!claim.claimed, ErrorCode::AlreadyClaimed);

        let winning_side = post.winning_side.ok_or(ErrorCode::NoWinner)?;

        let user_units = match winning_side {
            Side::Pump => pos.upvotes as u64,
            Side::Smack => pos.downvotes as u64,
        };

        if user_units == 0 {
            claim.claimed = true;
            return Ok(()); // non-winner → no payout
        }

        let payout = &ctx.accounts.post_mint_payout;

        // SCALE → unscale before transfer
        let scaled = user_units
            .checked_mul(payout.payout_per_winning_vote)
            .ok_or(ErrorCode::MathOverflow)?;

        let reward = scaled
            .checked_div(PRECISION)
            .ok_or(ErrorCode::MathOverflow)?;

        if reward == 0 {
            claim.claimed = true;
            return Ok(()); // too small to matter, claim and exit
        }

        // Transfer reward
        let post_key = post.key();
        let (_, bump) = Pubkey::find_program_address(
            &[POST_POT_AUTHORITY_SEED, post_key.as_ref()],
            ctx.program_id,
        );

        let bump_array = [bump];
        let seeds_array = [POST_POT_AUTHORITY_SEED, post_key.as_ref(), &bump_array];
        let seeds: &[&[&[u8]]] = &[&seeds_array];

        let cpi = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.post_pot_token_account.to_account_info(),
                to: ctx.accounts.user_vault_token_account.to_account_info(),
                authority: ctx.accounts.post_pot_authority.to_account_info(),
            },
            seeds,
        );

        anchor_spl::token::transfer(cpi, reward)?;

        claim.claimed = true;
        Ok(())
    }
}
