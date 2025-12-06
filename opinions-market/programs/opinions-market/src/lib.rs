use crate::pda_seeds::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;
pub mod constants;
pub mod instructions;
pub mod math;
pub mod middleware;
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
    #[msg("Zero votes not allowed")]
    ZeroVotes,
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
    #[msg("Invalid or missing Ed25519 signature verification instruction")]
    InvalidSignatureInstruction,
    #[msg("Session expired or invalid timestamp")]
    SessionExpired,
    #[msg("Unauthorized signer")]
    UnauthorizedSigner,
}
#[derive(Accounts)]
pub struct Ping {}

#[program]
pub mod opinions_market {

    use anchor_lang::solana_program::{ed25519_program, program::invoke};

    use crate::middleware::session::{assert_session_or_wallet, validate_session_signature};
    use anchor_lang::solana_program::sysvar::instructions::load_instruction_at_checked;

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
            ctx.accounts.payer.key(),
            ctx.accounts.bling_mint.key(),
            base_duration_secs,
            max_duration_secs,
            extension_per_vote_secs,
            ctx.bumps.config,
            [0; 7],
        );

        cfg.admin = new_cfg.admin;
        cfg.payer_authroity = new_cfg.payer_authroity;
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
        price_in_bling: u64, // How much is 1 token in BLING -
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

    // to be called only after create_user
    pub fn register_session(ctx: Context<RegisterSession>, expected_index: u8) -> Result<()> {
        // // ---- Load Ed25519 verify instruction from tx instruction list ----
        // let ix = load_instruction_at_checked(
        //     expected_index as usize,
        //     &ctx.accounts.instructions_sysvar,
        // )?;

        // // ---- Confirm this instruction is the Ed25519 system verifier ----
        // require!(
        //     ix.program_id == ed25519_program::ID,
        //     ErrorCode::InvalidSignatureInstruction
        // );

        // //
        // // ---- Extract verifying pubkey from instruction data ----
        // //
        // // Ed25519Verify instruction structure:
        // // see solana docs: https://docs.solana.com/developing/runtime-facilities/programs#ed25519-program
        // //
        // // layout:
        // // [0..1]  num_signatures
        // // [1..x]  struct describing signatures
        // // pubkey is commonly at bytes 16..48
        // //
        // let signer_pubkey_bytes = &ix.data[16..48];
        // let signer_pubkey =
        //     Pubkey::try_from(signer_pubkey_bytes).map_err(|_| ErrorCode::UnauthorizedSigner)?;

        // // Ensure the validated signature came from the user we expect
        // require!(
        //     signer_pubkey == ctx.accounts.user.key(),
        //     ErrorCode::UnauthorizedSigner
        // );

        let now = Clock::get()?.unix_timestamp;
        let expires_at = now + 60 * 60 * 24 * 30; // 30 days

        validate_session_signature(
            &ctx.accounts.user.key(),
            expected_index,
            &ctx.accounts.instructions_sysvar,
            expires_at,
        )?;

        // ---- Check expiry ----
        // let now = Clock::get()?.unix_timestamp;
        // require!(expires_at > now, ErrorCode::SessionExpired);

        // ---- Initialize SessionAuthority PDA ----
        let session = &mut ctx.accounts.session_authority;
        session.user = ctx.accounts.user.key();
        session.session_key = ctx.accounts.session_key.key();
        session.expires_at = expires_at;
        session.privileges_hash = [0u8; 32];
        session.bump = ctx.bumps.session_authority;

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
        let now = clock.unix_timestamp;

        assert_session_or_wallet(
            &ctx.accounts.user.key(),
            &ctx.accounts.session_authority.user,
            Some(&ctx.accounts.session_authority),
            now,
        )?;

        let config = &ctx.accounts.config;
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
    /// User pays from their vault; everything is denominated in BLING.

    pub fn vote_on_post(
        ctx: Context<VoteOnPost>,
        side: Side,
        votes: u64,
        post_id_hash: [u8; 32], // do not remove this - this is used to derive the post pda!
    ) -> Result<()> {
        require!(votes > 0, ErrorCode::ZeroVotes);
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        assert_session_or_wallet(
            &ctx.accounts.voter.key(),
            &ctx.accounts.session_authority.user,
            Some(&ctx.accounts.session_authority),
            now,
        )?;

        let cfg = &ctx.accounts.config;
        let post = &mut ctx.accounts.post;
        let current = match side {
            Side::Pump => post.upvotes,
            Side::Smack => post.downvotes,
        };

        let requested = votes as u64;
        let remaining_capacity = u64::MAX - current;

        // Cap valid votes at safe capacity
        let valid_votes = requested.min(remaining_capacity);

        if valid_votes < requested {
            msg!("⚠ Overflow prevented: {} votes requested, only {} applied. Full cost still charged.", requested, valid_votes);
        }

        msg!("clock.unix_timestamp: {}", now);
        msg!("post.end_time: {}", post.end_time);

        require!(post.state == PostState::Open, ErrorCode::PostNotOpen);
        require!(post.within_time_limit(now), ErrorCode::PostExpired);

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

        let vote = Vote::new(side, valid_votes, ctx.accounts.voter.key(), post.key());
        let cost_bling = vote.compute_cost_in_bling(post, pos, &ctx.accounts.voter_user_account)?;

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
        // ---- 2. CONVERT COSTS TO token_mint (if not BLING) ----
        //

        use crate::math::token_conversion::convert_bling_fees_to_token;

        // Get token decimals
        let token_decimals = ctx.accounts.token_mint.decimals;

        // Convert costs from BLING to selected token if needed
        let (protocol_fee_token, creator_pump_fee_token, pot_increment_token) =
            if ctx.accounts.token_mint.key() == ctx.accounts.config.bling_mint {
                // Already in BLING, no conversion needed
                (protocol_fee, creator_pump_fee, pot_increment)
            } else {
                // Convert from BLING to selected token using ValidPayment price
                let price_in_bling = ctx.accounts.valid_payment.price_in_bling;

                convert_bling_fees_to_token(
                    protocol_fee,
                    creator_pump_fee,
                    pot_increment,
                    price_in_bling,
                    token_decimals,
                )?
            };

        msg!("protocol_fee_token: {}", protocol_fee_token);
        msg!("creator_pump_fee_token: {}", creator_pump_fee_token);
        msg!("pot_increment_token: {}", pot_increment_token);

        //
        // ---- 3. TRANSFERS (IN token_mint) ----
        //

        let vault_bump = ctx.bumps.vault_authority;
        let user_authority_seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, &[vault_bump]]];

        // protocol fee
        if protocol_fee_token > 0 {
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
                protocol_fee_token,
            )?;
        }

        // creator fee
        if creator_pump_fee_token > 0 {
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
                creator_pump_fee_token,
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
            pot_increment_token,
        )?;

        //
        // ---- 4. UPDATE COUNTERS ----
        //

        match side {
            Side::Pump => {
                post.upvotes += valid_votes;
                pos.upvotes = pos.upvotes.saturating_add(valid_votes);
            }
            Side::Smack => {
                post.downvotes += valid_votes;
                pos.downvotes = pos.downvotes.saturating_add(valid_votes);
            }
        }

        // Extend post duration
        post.extend_time_limit(clock.unix_timestamp, valid_votes as u32, cfg)?;

        Ok(())
    }

    // This is token mint specific - to settle the pots for all tokens, chain all the
    //instructions together, each parametrized by individual token mints, and send it
    // off in one transaction.
    // Naturally this means we cannot require the PostState to be open, we only require it to be past the settlement time.
    // This is token mint specific - to settle the pots for all tokens, chain all the
    //instructions together, each parametrized by individual token mints, and send it
    // off in one transaction.
    // Naturally this means we cannot require the PostState to be open, we only require it to be past the settlement time.
    // This instruction does ALL the math and freezes it. NO token transfers happen here.
    pub fn settle_post(ctx: Context<SettlePost>, post_id_hash: [u8; 32]) -> Result<()> {
        msg!("\n🌟🌟🌟🌟🌟 Settling post 🌟🌟🌟🌟🌟");
        let post = &mut ctx.accounts.post;
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        msg!("clock.unix_timestamp: {}", now);
        msg!("post.end_time: {}", post.end_time);

        // If still within time limit, exit early.
        if post.within_time_limit(now) {
            msg!("Post is still within time limit, not doing anything and exiting early!");
            return Ok(());
        }

        // Check if already frozen (prevent re-settlement)
        let payout = &mut ctx.accounts.post_mint_payout;
        if payout.frozen {
            msg!("Post already settled and frozen, skipping");
            return Ok(());
        }

        // Determine winner — ties and zero votes = Pump side wins
        let (winner, total_winning_votes) = match post.upvotes.cmp(&post.downvotes) {
            std::cmp::Ordering::Greater => (Side::Pump, post.upvotes),
            std::cmp::Ordering::Less => (Side::Smack, post.downvotes),
            std::cmp::Ordering::Equal => (Side::Pump, post.upvotes), // tie → Pump wins
        };
        let initial_pot = ctx.accounts.post_pot_token_account.amount;

        msg!("Initial pot amount: {}", initial_pot);
        msg!(
            "Winner: {:?}, Winning votes: {}",
            winner,
            total_winning_votes
        );

        // Calculate mother post fee (10% for child posts, only if parent is still open)
        let mother_fee = match post.post_type {
            PostType::Child { .. } => {
                let parent = ctx
                    .accounts
                    .parent_post
                    .as_ref()
                    .ok_or(ErrorCode::InvalidParentPost)?;
                if parent.state == PostState::Open {
                    initial_pot / 10
                } else {
                    0
                }
            }
            _ => 0,
        };

        let pot_after_mother = initial_pot
            .checked_sub(mother_fee)
            .ok_or(ErrorCode::MathOverflow)?;

        // Calculate protocol fee (1% of remaining pot after mother fee)
        let protocol_fee = pot_after_mother
            .checked_mul(PARAMS.protocol_vote_settlement_fee_bps as u64)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(10_000)
            .ok_or(ErrorCode::MathOverflow)?;

        let pot_after_protocol = pot_after_mother
            .checked_sub(protocol_fee)
            .ok_or(ErrorCode::MathOverflow)?;

        // Calculate creator fee (40% of remaining pot if Pump wins, 0 if Smack wins)
        let creator_fee = match winner {
            Side::Pump => pot_after_protocol
                .checked_mul(PARAMS.creator_pump_win_settlement_fee_bps as u64)
                .ok_or(ErrorCode::MathOverflow)?
                .checked_div(10_000)
                .ok_or(ErrorCode::MathOverflow)?,
            Side::Smack => 0,
        };

        let total_payout = pot_after_protocol
            .checked_sub(creator_fee)
            .ok_or(ErrorCode::MathOverflow)?;

        // Calculate payout_per_winning_vote (scaled by PRECISION)
        let payout_per_winning_vote = if total_winning_votes == 0 {
            0
        } else {
            total_payout
                .checked_mul(PRECISION)
                .ok_or(ErrorCode::MathOverflow)?
                .checked_div(total_winning_votes)
                .ok_or(ErrorCode::MathOverflow)?
        };

        msg!("Fees calculated:");
        msg!("  Mother fee: {}", mother_fee);
        msg!("  Protocol fee: {}", protocol_fee);
        msg!("  Creator fee: {}", creator_fee);
        msg!("  Total payout for voters: {}", total_payout);
        msg!("  Payout per winning vote: {}", payout_per_winning_vote);

        // Freeze all calculations in PostMintPayout
        let new_payout = PostMintPayout::new(
            post.key(),
            ctx.accounts.token_mint.key(),
            initial_pot,
            total_payout,
            payout_per_winning_vote,
            creator_fee,
            protocol_fee,
            mother_fee,
            ctx.bumps.post_mint_payout,
        );

        payout.post = new_payout.post;
        payout.token_mint = new_payout.token_mint;
        payout.initial_pot = new_payout.initial_pot;
        payout.total_payout = new_payout.total_payout;
        payout.payout_per_winning_vote = new_payout.payout_per_winning_vote;
        payout.creator_fee = new_payout.creator_fee;
        payout.protocol_fee = new_payout.protocol_fee;
        payout.mother_fee = new_payout.mother_fee;
        payout.frozen = new_payout.frozen;
        payout.bump = new_payout.bump;

        // Update post state
        if post.winning_side.is_none() {
            post.winning_side = Some(winner);
        }

        if post.state == PostState::Open {
            post.state = PostState::Settled;
        }

        require!(post.state == PostState::Settled, ErrorCode::PostNotSettled);

        msg!("✅ Settlement frozen successfully. Distribution instructions can now be called.");

        Ok(())
    }

    /// Distribute creator reward from frozen settlement.
    /// Reads creator_fee from PostMintPayout and transfers it to creator's vault.
    pub fn distribute_creator_reward(
        ctx: Context<DistributeCreatorReward>,
        post_id_hash: [u8; 32],
    ) -> Result<()> {
        let payout = &ctx.accounts.post_mint_payout;
        require!(payout.frozen, ErrorCode::PostNotSettled);

        let creator_fee = payout.creator_fee;
        if creator_fee == 0 {
            msg!("No creator fee to distribute");
            return Ok(());
        }

        msg!("Distributing creator fee: {}", creator_fee);

        let post_key = ctx.accounts.post.key();
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
                to: ctx.accounts.creator_vault_token_account.to_account_info(),
                authority: ctx.accounts.post_pot_authority.to_account_info(),
            },
            seeds,
        );

        anchor_spl::token::transfer(cpi, creator_fee)?;

        msg!("✅ Creator reward distributed successfully");

        Ok(())
    }

    /// Distribute protocol fee from frozen settlement.
    /// Reads protocol_fee from PostMintPayout and transfers it to protocol treasury.
    pub fn distribute_protocol_fee(
        ctx: Context<DistributeProtocolFee>,
        post_id_hash: [u8; 32],
    ) -> Result<()> {
        let payout = &ctx.accounts.post_mint_payout;
        require!(payout.frozen, ErrorCode::PostNotSettled);

        let protocol_fee = payout.protocol_fee;
        if protocol_fee == 0 {
            msg!("No protocol fee to distribute");
            return Ok(());
        }

        msg!("Distributing protocol fee: {}", protocol_fee);

        let post_key = ctx.accounts.post.key();
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
                to: ctx
                    .accounts
                    .protocol_token_treasury_token_account
                    .to_account_info(),
                authority: ctx.accounts.post_pot_authority.to_account_info(),
            },
            seeds,
        );

        anchor_spl::token::transfer(cpi, protocol_fee)?;

        msg!("✅ Protocol fee distributed successfully");

        Ok(())
    }

    /// Distribute parent post share from frozen settlement.
    /// Reads mother_fee from PostMintPayout and transfers it to parent post's pot.
    pub fn distribute_parent_post_share(
        ctx: Context<DistributeParentPostShare>,
        post_id_hash: [u8; 32],
    ) -> Result<()> {
        let payout = &ctx.accounts.post_mint_payout;
        require!(payout.frozen, ErrorCode::PostNotSettled);

        let mother_fee = payout.mother_fee;
        if mother_fee == 0 {
            msg!("No mother post fee to distribute");
            return Ok(());
        }

        let parent_post = ctx
            .accounts
            .parent_post
            .as_ref()
            .ok_or(ErrorCode::InvalidParentPost)?;
        let parent_post_pot = ctx
            .accounts
            .parent_post_pot_token_account
            .as_ref()
            .ok_or(ErrorCode::InvalidParentPost)?;
        msg!(
            "Distributing mother post fee: {} to parent post: {}",
            mother_fee,
            parent_post.key()
        );

        // Transfer from child post pot to parent post pot
        let post_key = ctx.accounts.post.key();
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
                to: parent_post_pot.to_account_info(),
                authority: ctx.accounts.post_pot_authority.to_account_info(),
            },
            seeds,
        );

        anchor_spl::token::transfer(cpi, mother_fee)?;

        msg!("✅ Parent post share distributed successfully");

        Ok(())
    }

    pub fn claim_post_reward(ctx: Context<ClaimPostReward>, post_id_hash: [u8; 32]) -> Result<()> {
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        assert_session_or_wallet(
            &ctx.accounts.user.key(),
            &ctx.accounts.session_authority.user,
            Some(&ctx.accounts.session_authority),
            now,
        )?;
        let post = &ctx.accounts.post;
        let pos = &mut ctx.accounts.position;
        let claim = &mut ctx.accounts.user_post_mint_claim;
        let payout = &ctx.accounts.post_mint_payout;

        require!(post.state == PostState::Settled, ErrorCode::PostNotSettled);
        require!(payout.frozen, ErrorCode::PostNotSettled); // Must be frozen (settled)
        require!(!claim.claimed, ErrorCode::AlreadyClaimed);

        let winning_side = post.winning_side.ok_or(ErrorCode::NoWinner)?;

        let user_votes = match winning_side {
            Side::Pump => pos.upvotes as u64,
            Side::Smack => pos.downvotes as u64,
        };

        if user_votes == 0 {
            claim.claimed = true;
            return Ok(()); // non-winner → no payout
        }

        // SCALE → unscale before transfer
        let scaled = user_votes
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
