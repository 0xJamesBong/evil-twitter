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
    #[msg("Unauthorized: user account does not belong to the payer")]
    Unauthorized,
    #[msg("Invalid parent post")]
    InvalidParentPost,
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
        cfg.protocol_vote_fee_bps = protocol_fee_bps;
        cfg.creator_pump_vote_fee_bps = creator_fee_bps_pump;
        cfg.base_duration_secs = 24 * 3600;
        cfg.max_duration_secs = 48 * 3600;
        cfg.extension_per_vote_secs = 60;
        cfg.bump = ctx.bumps.config;
        cfg.padding = [0; 7];

        let am = &mut ctx.accounts.valid_payment;
        am.token_mint = ctx.accounts.bling_mint.key();
        am.price_in_bling = 1;
        am.treasury_token_account = ctx.accounts.protocol_bling_treasury.key();
        am.enabled = true;
        am.bump = ctx.bumps.valid_payment;
        Ok(())
    }

    pub fn register_valid_payment(
        ctx: Context<RegisterValidPayment>,
        price_in_bling: u64, // How much is 1 token in BLING units -
    ) -> Result<()> {
        let cfg = &ctx.accounts.config;

        // Note: Duplicate registration is prevented by the `init` constraint on alternative_payment account.
        // If the account already exists (same PDA seeds), init will fail before this function is called.

        let am = &mut ctx.accounts.valid_payment;
        am.token_mint = ctx.accounts.token_mint.key();
        am.price_in_bling = price_in_bling;
        am.treasury_token_account = ctx.accounts.treasury_token_account.key();
        am.enabled = true;
        am.bump = ctx.bumps.valid_payment;
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

        let seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, &[ctx.bumps.vault_authority]]];

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
        let now = clock.unix_timestamp;
        let post = &mut ctx.accounts.post;
        let new_post = PostAccount::new(
            ctx.accounts.creator_user_account.key(),
            post_id_hash,
            match parent_post_pda {
                Some(parent_pda) => PostType::Child { parent: parent_pda },
                None => PostType::Original,
            },
            now,
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
        post.payout_per_unit = new_post.payout_per_unit;

        Ok(())
    }

    /// Core MVP voting instruction.
    /// User pays from their vault; everything is denominated in BLING units.

    pub fn vote_on_post(ctx: Context<VoteOnPost>, side: Side, units: u32) -> Result<()> {
        require!(units > 0, ErrorCode::ZeroUnits);

        let cfg = &ctx.accounts.config;
        let post = &mut ctx.accounts.post;
        let pos = &mut ctx.accounts.position;

        let clock = Clock::get()?;
        require!(post.state == PostState::Open, ErrorCode::PostNotOpen);
        require!(
            post.within_time_limit(clock.unix_timestamp),
            ErrorCode::PostExpired
        );

        // 1) calculate cost
        let vote = Vote::new(side, units, ctx.accounts.user.key(), post.key());
        let cost_bling = vote.compute_cost_in_bling(post, pos, &ctx.accounts.user_account, cfg)?;

        // 2) fee calculation
        let protocol_fee = cost_bling * (cfg.protocol_vote_fee_bps as u64) / 10_000;
        let creator_fee = match side {
            Side::Pump => cost_bling * (cfg.creator_pump_vote_fee_bps as u64) / 10_000,
            Side::Smack => 0,
        };

        let pot_increment = cost_bling
            .checked_sub(protocol_fee + creator_fee)
            .ok_or(ErrorCode::MathOverflow)?;

        let paying_in_bling = ctx.accounts.token_mint.key() == cfg.bling_mint;

        // Seeds for vault_authority
        let signer_seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, &[ctx.bumps.vault_authority]]];

        // =======================================================================
        // CASE 1: PAYING IN BLING
        // =======================================================================
        if paying_in_bling {
            // protocol fee transfer
            if protocol_fee > 0 {
                let cpi_accounts = anchor_spl::token::Transfer {
                    from: ctx.accounts.user_vault_token_account.to_account_info(),
                    to: ctx
                        .accounts
                        .protocol_token_treasury_token_account
                        .to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts,
                    signer_seeds,
                );
                anchor_spl::token::transfer(cpi_ctx, protocol_fee)?;
            }

            // creator fee transfer
            if creator_fee > 0 {
                let cpi_accounts = anchor_spl::token::Transfer {
                    from: ctx.accounts.user_vault_token_account.to_account_info(),
                    to: ctx.accounts.creator_vault_token_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts,
                    signer_seeds,
                );
                anchor_spl::token::transfer(cpi_ctx, creator_fee)?;
            }

            // pot increment transfer
            let cpi_accounts = anchor_spl::token::Transfer {
                from: ctx.accounts.user_vault_token_account.to_account_info(),
                to: ctx.accounts.post_pot_token_account.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            };

            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer_seeds,
            );

            anchor_spl::token::transfer(cpi_ctx, pot_increment)?;
        }
        // =======================================================================
        // CASE 2: PAYING IN ALTERNATIVE TOKEN (USDC / SOL / ETC)
        // =======================================================================
        else {
            let valid = &ctx.accounts.valid_payment;

            // convert cost_bling → alt-token amount
            let amount_alt_tokens = cost_bling
                .checked_mul(1_000_000) // assume 6 decimals
                .ok_or(ErrorCode::MathOverflow)?
                / valid.price_in_bling;

            // 1) Take user alt-tokens into treasury
            {
                let cpi_accounts = anchor_spl::token::Transfer {
                    from: ctx.accounts.user_vault_token_account.to_account_info(),
                    to: ctx
                        .accounts
                        .protocol_token_treasury_token_account
                        .to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts,
                    signer_seeds,
                );
                anchor_spl::token::transfer(cpi_ctx, amount_alt_tokens)?;
            }

            // 2) Mint BLING to protocol/creator/pot
            let bling_mint = &ctx.accounts.bling_mint;
            let bling_auth = &ctx.accounts.bling_mint_authority;

            // PDA for bling mint authority
            let (_, bump) =
                Pubkey::find_program_address(&[b"bling_mint_authority"], ctx.program_id);

            let bling_seeds: &[&[&[u8]]] = &[&[b"bling_mint_authority", &[bump]]];

            // mint protocol fee
            if protocol_fee > 0 {
                let cpi_accounts = anchor_spl::token::MintTo {
                    mint: bling_mint.to_account_info(),
                    to: ctx
                        .accounts
                        .protocol_token_treasury_token_account
                        .to_account_info(),
                    authority: bling_auth.to_account_info(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts,
                    bling_seeds,
                );
                anchor_spl::token::mint_to(cpi_ctx, protocol_fee)?;
            }

            // mint creator fee
            if creator_fee > 0 {
                let cpi_accounts = anchor_spl::token::MintTo {
                    mint: bling_mint.to_account_info(),
                    to: ctx.accounts.creator_token_vault.to_account_info(),
                    authority: bling_auth.to_account_info(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts,
                    bling_seeds,
                );
                anchor_spl::token::mint_to(cpi_ctx, creator_fee)?;
            }

            // mint pot increment
            {
                let cpi_accounts = anchor_spl::token::MintTo {
                    mint: bling_mint.to_account_info(),
                    to: ctx.accounts.post_pot_token_account.to_account_info(),
                    authority: bling_auth.to_account_info(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts,
                    bling_seeds,
                );
                anchor_spl::token::mint_to(cpi_ctx, pot_increment)?;
            }
        }

        // =======================================================================
        // Update state
        // =======================================================================

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

        let ext = (cfg.extension_per_vote_secs as i64)
            .checked_mul(units as i64)
            .ok_or(ErrorCode::MathOverflow)?;
        post.end_time = post
            .end_time
            .checked_add(ext)
            .ok_or(ErrorCode::MathOverflow)?
            .min(post.start_time + cfg.max_duration_secs as i64);

        Ok(())
    }

    pub fn settle_post(ctx: Context<SettlePost>) -> Result<()> {
        let post = &mut ctx.accounts.post;
        let clock = Clock::get()?;

        // --- 1. Pre-conditions ---
        require!(post.state == PostState::Open, ErrorCode::PostNotOpen);
        require!(
            clock.unix_timestamp > post.end_time,
            ErrorCode::PostNotExpired
        );

        // --- 2. Determine winner ---
        let (winner, total_winning_votes) = if post.upvotes > post.downvotes {
            (Side::Pump, post.upvotes)
        } else if post.downvotes > post.upvotes {
            (Side::Smack, post.downvotes)
        } else {
            // --------------------------------------
            // Tie: pot → protocol treasury
            // --------------------------------------
            let pot_amount = ctx.accounts.post_pot_token_account.amount;

            if pot_amount > 0 {
                let post_key = post.key();
                let (_addr, bump) = Pubkey::find_program_address(
                    &[POST_POT_AUTHORITY_SEED, post_key.as_ref()],
                    ctx.program_id,
                );

                let signer_seeds: &[&[&[u8]]] =
                    &[&[POST_POT_AUTHORITY_SEED, post_key.as_ref(), &[bump]]];

                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.post_pot_token_account.to_account_info(),
                        to: ctx
                            .accounts
                            .protocol_token_treasury_token_account
                            .to_account_info(),
                        authority: ctx.accounts.post_pot_authority.to_account_info(),
                    },
                    signer_seeds,
                );
                anchor_spl::token::transfer(cpi_ctx, pot_amount)?;
            }

            post.state = PostState::Settled;
            post.winning_side = None;
            post.payout_per_unit = 0;

            return Ok(());
        };

        // --- 3. Compute payout_per_unit ---
        //
        // NOTE: total_winning_votes **is in BLING units**, not "number of votes".
        // So unit payout = pot / total_winning_votes
        //
        let pot_amount = ctx.accounts.post_pot_token_account.amount;
        let payout_per_unit = if total_winning_votes > 0 {
            pot_amount / total_winning_votes
        } else {
            0
        };

        // --- 4. Child Post logic (optional) ---
        //
        // If this is a child post, automatically forward 10% of the pot to the parent.
        // (You can disable/remove this if not needed.)
        //
        if let PostType::Child { parent } = post.post_type {
            let child_cut = pot_amount / 10; // 10% → parent
            if child_cut > 0 {
                let post_key = post.key();
                let (_p, bump) = Pubkey::find_program_address(
                    &[POST_POT_AUTHORITY_SEED, post_key.as_ref()],
                    ctx.program_id,
                );
                let child_seeds: &[&[&[u8]]] =
                    &[&[POST_POT_AUTHORITY_SEED, post_key.as_ref(), &[bump]]];

                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.post_pot_token_account.to_account_info(),
                        to: ctx.accounts.parent_post_pot_token_account.to_account_info(),
                        authority: ctx.accounts.post_pot_authority.to_account_info(),
                    },
                    child_seeds,
                );
                anchor_spl::token::transfer(cpi_ctx, child_cut)?;
            }
        }

        // --- 5. Update post state ---
        post.state = PostState::Settled;
        post.winning_side = Some(winner);
        post.payout_per_unit = payout_per_unit;

        Ok(())
    }

    // pub fn claim_post_reward(ctx: Context<ClaimPostReward>) -> Result<()> {
    //     let post = &ctx.accounts.post;
    //     let position = &mut ctx.accounts.position;

    //     require!(post.state == PostState::Settled, ErrorCode::PostNotSettled);
    //     require!(!position.claimed, ErrorCode::AlreadyClaimed);

    //     //
    //     // 1. Determine user vote weight
    //     //
    //     let winning_side = post.winning_side.ok_or(ErrorCode::NoWinner)?;

    //     let user_votes = match winning_side {
    //         Side::Pump => position.upvotes as u64,
    //         Side::Smack => position.downvotes as u64,
    //     };

    //     if user_votes == 0 {
    //         position.claimed = true;
    //         return Ok(());
    //     }

    //     //
    //     // 2. Compute reward
    //     //
    //     let reward = user_votes
    //         .checked_mul(post.payout_per_unit)
    //         .ok_or(ErrorCode::MathOverflow)?;

    //     if reward == 0 {
    //         position.claimed = true;
    //         return Ok(());
    //     }

    //     //
    //     // 3. Transfer reward from post pot PDA → user vault
    //     //
    //     let post_key = post.key();
    //     let (_, bump) = Pubkey::find_program_address(
    //         &[POST_POT_AUTHORITY_SEED, post_key.as_ref()],
    //         ctx.program_id,
    //     );

    //     let seeds: &[&[&[u8]]] = &[&[POST_POT_AUTHORITY_SEED, post_key.as_ref(), &[bump]]];

    //     let cpi_accounts = anchor_spl::token::Transfer {
    //         from: ctx.accounts.post_pot_bling.to_account_info(),
    //         to: ctx.accounts.user_bling_vault.to_account_info(),
    //         authority: ctx.accounts.post_pot_authority.to_account_info(),
    //     };

    //     let cpi_ctx = CpiContext::new_with_signer(
    //         ctx.accounts.token_program.to_account_info(),
    //         cpi_accounts,
    //         seeds,
    //     );

    //     anchor_spl::token::transfer(cpi_ctx, reward)?;

    //     //
    //     // 4. Mark as claimed
    //     //
    //     position.claimed = true;
    //     Ok(())
    // }
}
