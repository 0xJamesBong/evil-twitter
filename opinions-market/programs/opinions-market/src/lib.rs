use crate::pda_seeds::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;
pub mod constants;
pub mod instructions;
pub mod math;
pub mod modifiers;
pub mod pda_seeds;
pub mod states;
use crate::modifiers::effect::PermanentEffect;
use constants::*;
use instructions::*;
use states::*;

declare_id!("4z5rjroGdWmgGX13SdFsh4wRM4jJkMUrcvYrNpV3gezm");

#[program]
pub mod opinions_market {

    use anchor_lang::solana_program::{ed25519_program, program::invoke};

    use anchor_lang::solana_program::sysvar::instructions::load_instruction_at_checked;

    use super::*;

    // -------------------------------------------------------------------------
    // INITIALIZATION
    // -------------------------------------------------------------------------

    pub fn initialize(
        ctx: Context<Initialize>,
        base_duration_secs: u32,
        max_duration_secs: u32,
        extension_per_vote_secs: u32,
        resurrection_fee: u64,
        resurrection_fee_bling_premium: u64,
    ) -> Result<()> {
        let om_config = &mut ctx.accounts.om_config;

        let new_config = OMConfig::new(
            ctx.accounts.admin.key(),
            ctx.accounts.authorized_issuer.key(),
            base_duration_secs,
            max_duration_secs,
            extension_per_vote_secs,
            resurrection_fee,
            resurrection_fee_bling_premium,
            ctx.bumps.om_config,
            [0; 7],
        );

        om_config.admin = new_config.admin;
        om_config.authorized_issuer = new_config.authorized_issuer;
        om_config.base_duration_secs = new_config.base_duration_secs;
        om_config.max_duration_secs = new_config.max_duration_secs;
        om_config.extension_per_vote_secs = new_config.extension_per_vote_secs;
        om_config.resurrection_fee = new_config.resurrection_fee;
        om_config.resurrection_fee_bling_premium = new_config.resurrection_fee_bling_premium;
        om_config.bump = new_config.bump;
        om_config.padding = new_config.padding;

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

        // Auth: session or wallet via CPI
        persona::cpi::check_session_or_wallet(
            CpiContext::new(
                ctx.accounts.persona_program.to_account_info(),
                persona::cpi::accounts::CheckSessionOrWallet {
                    user: ctx.accounts.user.to_account_info(),
                    session_key: ctx.accounts.session_key.to_account_info(),
                    session_authority: ctx.accounts.session_authority.to_account_info(),
                },
            ),
            now,
        )?;

        let relation = match parent_post_pda {
            Some(parent_pda) => PostRelation::Reply { parent: parent_pda },
            None => PostRelation::Root,
        };
        let config = &ctx.accounts.om_config;
        let post = &mut ctx.accounts.post;
        let new_post = PostAccount::new(
            ctx.accounts.user.key(),
            post_id_hash,
            PostFunction::Normal,
            relation,
            now,
            config,
            ctx.bumps.post,
        );

        post.creator_user = new_post.creator_user;
        post.post_id_hash = new_post.post_id_hash;
        post.function = new_post.function;
        post.relation = new_post.relation;
        post.forced_outcome = new_post.forced_outcome;
        post.start_time = new_post.start_time;
        post.end_time = new_post.end_time;
        post.state = new_post.state;
        post.upvotes = new_post.upvotes;
        post.downvotes = new_post.downvotes;
        post.winning_side = new_post.winning_side;

        // Initialize voter_account if it was just created
        let voter_account = &mut ctx.accounts.voter_account;
        if voter_account.voter == Pubkey::default() {
            let new_voter_account =
                VoterAccount::default(ctx.accounts.user.key(), ctx.bumps.voter_account);
            voter_account.voter = new_voter_account.voter;
            voter_account.appearance = new_voter_account.appearance;
            voter_account.body = new_voter_account.body;
            voter_account.bump = new_voter_account.bump;
        }

        Ok(())
    }

    /// Core MVP voting instruction.
    /// User pays from their vault; everything is denominated in dollars.

    pub fn create_question(ctx: Context<CreatePost>, post_id_hash: [u8; 32]) -> Result<()> {
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        // ---------------------------------------------------------------------
        // Auth: wallet OR session
        // ---------------------------------------------------------------------
        // Auth: session or wallet via CPI
        persona::cpi::check_session_or_wallet(
            CpiContext::new(
                ctx.accounts.persona_program.to_account_info(),
                persona::cpi::accounts::CheckSessionOrWallet {
                    user: ctx.accounts.user.to_account_info(),
                    session_key: ctx.accounts.session_key.to_account_info(),
                    session_authority: ctx.accounts.session_authority.to_account_info(),
                },
            ),
            now,
        )?;
        let config = &ctx.accounts.om_config;
        let post = &mut ctx.accounts.post;

        // ---------------------------------------------------------------------
        // Enforced invariants
        // ---------------------------------------------------------------------
        let function = PostFunction::Question;
        let relation = PostRelation::Root;

        // ---------------------------------------------------------------------
        // Initialize PostAccount
        // ---------------------------------------------------------------------
        let new_post = PostAccount::new(
            ctx.accounts.user.key(),
            post_id_hash,
            function,
            relation,
            now,
            config,
            ctx.bumps.post,
        );

        // ---------------------------------------------------------------------
        // Write to account
        // ---------------------------------------------------------------------
        post.creator_user = new_post.creator_user;
        post.post_id_hash = new_post.post_id_hash;
        post.function = new_post.function;
        post.relation = new_post.relation;
        post.forced_outcome = new_post.forced_outcome;
        post.start_time = new_post.start_time;
        post.end_time = new_post.end_time;
        post.state = new_post.state;
        post.upvotes = new_post.upvotes;
        post.downvotes = new_post.downvotes;
        post.winning_side = new_post.winning_side;
        post.bump = new_post.bump;
        post.reserved = new_post.reserved;

        // Initialize voter_account if it was just created
        let voter_account = &mut ctx.accounts.voter_account;
        if voter_account.voter == Pubkey::default() {
            let new_voter_account =
                VoterAccount::default(ctx.accounts.user.key(), ctx.bumps.voter_account);
            voter_account.voter = new_voter_account.voter;
            voter_account.appearance = new_voter_account.appearance;
            voter_account.body = new_voter_account.body;
            voter_account.bump = new_voter_account.bump;
        }

        Ok(())
    }

    pub fn create_answer(
        ctx: Context<CreateAnswer>,
        answer_post_id_hash: [u8; 32],
        _question_post_id_hash: [u8; 32],
    ) -> Result<()> {
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        // Auth: session or wallet via CPI
        persona::cpi::check_session_or_wallet(
            CpiContext::new(
                ctx.accounts.persona_program.to_account_info(),
                persona::cpi::accounts::CheckSessionOrWallet {
                    user: ctx.accounts.user.to_account_info(),
                    session_key: ctx.accounts.session_key.to_account_info(),
                    session_authority: ctx.accounts.session_authority.to_account_info(),
                },
            ),
            now,
        )?;
        let config = &ctx.accounts.om_config;
        let post = &mut ctx.accounts.post;
        let question = &ctx.accounts.question_post;

        // ---------------------------------------------------------------------
        // Enforced invariants (redundant safety)
        // ---------------------------------------------------------------------
        require!(
            question.function == PostFunction::Question,
            ErrorCode::AnswerMustTargetQuestion
        );

        require!(
            matches!(question.relation, PostRelation::Root),
            ErrorCode::AnswerTargetNotRoot
        );

        // ---------------------------------------------------------------------
        // Construct Answer
        // ---------------------------------------------------------------------
        let function = PostFunction::Answer;
        let relation = PostRelation::AnswerTo {
            question: question.key(),
        };

        let new_post = PostAccount::new(
            ctx.accounts.user.key(),
            answer_post_id_hash,
            function,
            relation,
            now,
            config,
            ctx.bumps.post,
        );

        // ---------------------------------------------------------------------
        // Write to account
        // ---------------------------------------------------------------------
        post.creator_user = new_post.creator_user;
        post.post_id_hash = new_post.post_id_hash;
        post.function = new_post.function;
        post.relation = new_post.relation;
        post.forced_outcome = new_post.forced_outcome; // may be set later by question owner
        post.start_time = new_post.start_time;
        post.end_time = new_post.end_time;
        post.state = new_post.state;
        post.upvotes = new_post.upvotes;
        post.downvotes = new_post.downvotes;
        post.winning_side = new_post.winning_side;
        post.bump = new_post.bump;
        post.reserved = new_post.reserved;

        Ok(())
    }

    pub fn vote_on_post(
        ctx: Context<VoteOnPost>,
        side: Side,
        votes: u64,
        post_id_hash: [u8; 32], // do not remove this - this is used to derive the post pda!
    ) -> Result<()> {
        require!(votes > 0, ErrorCode::ZeroVotes);
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;
        // todo: replace with CPI to persona::cpi::check_session_or_wallet
        persona::cpi::check_session_or_wallet(
            CpiContext::new(
                ctx.accounts.persona_program.to_account_info(),
                persona::cpi::accounts::CheckSessionOrWallet {
                    user: ctx.accounts.voter.to_account_info(),
                    session_key: ctx.accounts.session_key.to_account_info(),
                    session_authority: ctx.accounts.session_authority.to_account_info(),
                },
            ),
            now,
        )?;

        let om_config = &ctx.accounts.om_config;
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

        // Extract creator_user pubkey before any mutable borrows (needed for creator vault initialization)
        let creator_user_key = post.creator_user;

        // Handle position
        let pos = &mut ctx.accounts.position;
        if pos.voter == Pubkey::default() {
            let new_pos = VoterPostPosition::new(ctx.accounts.voter.key(), post.key());
            pos.voter = new_pos.voter;
            pos.post = new_pos.post;
            pos.upvotes = new_pos.upvotes;
            pos.downvotes = new_pos.downvotes;
        }

        //
        // ---- 1. Compute dollar cost ----
        //

        let vote = Vote::new(side, valid_votes, ctx.accounts.voter.key(), post.key());
        // get karma from persona

        let voter_account = ctx.accounts.voter_account.as_ref();
        let cost_dollar = vote.compute_cost_in_dollar(post, pos, voter_account)?;

        msg!("cost_dollar: {}", cost_dollar);
        msg!("post.upvotes BEFORE: {}", post.upvotes);

        let protocol_fee = cost_dollar * (PARAMS.protocol_vote_fee_bps as u64) / 10_000;
        let creator_pump_fee = match side {
            Side::Pump => cost_dollar * (PARAMS.creator_pump_fee_bps as u64) / 10_000,
            Side::Smack => 0,
        };

        let pot_increment = cost_dollar
            .checked_sub(protocol_fee + creator_pump_fee)
            .ok_or(ErrorCode::MathOverflow)?;

        //
        // ---- 2. TRANSFERS via Fed (all in dollars) ----
        //

        // Protocol fee transfer (Fed vault → OM treasury)
        if protocol_fee > 0 {
            fed::cpi::convert_dollar_and_charge_to_protocol_treasury(
                CpiContext::new(
                    ctx.accounts.fed_program.to_account_info(),
                    fed::cpi::accounts::ConvertDollarAndChargeToProtocolTreasury {
                        user: ctx.accounts.voter.to_account_info(),
                        from_user_vault_token_account: ctx
                            .accounts
                            .voter_user_vault_token_account
                            .to_account_info(),
                        protocol_treasury_token_account: ctx
                            .accounts
                            .protocol_token_treasury_token_account
                            .to_account_info(),
                        valid_payment: ctx.accounts.valid_payment.to_account_info(),
                        token_mint: ctx.accounts.token_mint.to_account_info(),
                        fed_config: ctx.accounts.fed_config.to_account_info(),
                        vault_authority: ctx.accounts.vault_authority.to_account_info(),
                        token_program: ctx.accounts.token_program.to_account_info(),
                    },
                ),
                protocol_fee,
            )?;
        }

        // Creator fee transfer (Fed vault → Fed creator vault)
        if creator_pump_fee > 0 {
            // Validate that creator_user account matches post.creator_user
            require!(
                ctx.accounts.creator_user.key() == creator_user_key,
                ErrorCode::MathOverflow // Using MathOverflow as a generic error
            );

            fed::cpi::convert_dollar_and_transfer_out_of_fed_user_account_to_fed_user_account(
                CpiContext::new(
                    ctx.accounts.fed_program.to_account_info(),
                    fed::cpi::accounts::ConvertDollarAndTransferOutOfFedUserAccountToFedUserAccount {
                        user_from: ctx.accounts.voter.to_account_info(),
                        user_to: ctx.accounts.creator_user.to_account_info(),
                        from_user_vault_token_account: ctx
                            .accounts
                            .voter_user_vault_token_account
                            .to_account_info(),
                        to_user_vault_token_account: ctx.accounts.creator_vault_token_account.to_account_info(),
                        valid_payment: ctx.accounts.valid_payment.to_account_info(),
                        token_mint: ctx.accounts.token_mint.to_account_info(),
                        vault_authority: ctx.accounts.vault_authority.to_account_info(),
                        payer: ctx.accounts.payer.to_account_info(),
                        token_program: ctx.accounts.token_program.to_account_info(),
                        system_program: ctx.accounts.system_program.to_account_info(),
                    },
                ),
                creator_pump_fee,
            )?;
        }

        // Pot increment transfer (Fed vault → OM post pot)
        // Note: pot_increment is in dollars, function will convert to token
        if pot_increment > 0 {
            fed::cpi::convert_dollar_and_transfer_out_of_fed_user_account(
                CpiContext::new(
                    ctx.accounts.fed_program.to_account_info(),
                    fed::cpi::accounts::ConvertDollarAndTransferOutOfFedUserAccount {
                        user_from: ctx.accounts.voter.to_account_info(),
                        user: ctx.accounts.voter.to_account_info(),
                        from_user_vault_token_account: ctx
                            .accounts
                            .voter_user_vault_token_account
                            .to_account_info(),
                        to: ctx.accounts.post_pot_token_account.to_account_info(),
                        valid_payment: ctx.accounts.valid_payment.to_account_info(),
                        token_mint: ctx.accounts.token_mint.to_account_info(),
                        vault_authority: ctx.accounts.vault_authority.to_account_info(),
                        token_program: ctx.accounts.token_program.to_account_info(),
                    },
                ),
                pot_increment,
            )?;
        }

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
        post.extend_time_limit(clock.unix_timestamp, valid_votes as u32, om_config)?;

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
        let mother_fee = match (&post.function, &post.relation) {
            // Replies and quotes feed parent pot (if parent still open)
            (PostFunction::Normal, PostRelation::Reply { .. })
            | (PostFunction::Normal, PostRelation::Quote { .. }) => {
                let parent_post = ctx
                    .accounts
                    .parent_post
                    .as_ref()
                    .ok_or(ErrorCode::InvalidParentPost)?;

                if parent_post.state == PostState::Open {
                    initial_pot / 10
                } else {
                    0
                }
            }

            // Answers NEVER feed question pot
            (PostFunction::Answer, PostRelation::AnswerTo { .. }) => 0,

            // Roots never have a mother
            (_, PostRelation::Root) => 0,

            // All other combinations
            _ => return err!(ErrorCode::InvalidRelation),
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

    // / Distribute creator reward from frozen settlement.
    // / Reads creator_fee from PostMintPayout and transfers it to creator's vault.
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
        let (_, post_pot_bump) = Pubkey::find_program_address(
            &[POST_POT_AUTHORITY_SEED, post_key.as_ref()],
            ctx.program_id,
        );
        let post_pot_authority_seeds: &[&[&[u8]]] =
            &[&[POST_POT_AUTHORITY_SEED, post_key.as_ref(), &[post_pot_bump]]];

        fed::cpi::transfer_into_fed_user_account(
            CpiContext::new_with_signer(
                ctx.accounts.fed_program.to_account_info(),
                fed::cpi::accounts::TransferIntoFedUserAccount {
                    from: ctx.accounts.post_pot_token_account.to_account_info(),
                    from_authority: ctx.accounts.post_pot_authority.to_account_info(),
                    user: ctx.accounts.creator_user.to_account_info(),
                    to_user_vault_token_account: ctx
                        .accounts
                        .creator_vault_token_account
                        .to_account_info(),
                    valid_payment: ctx.accounts.valid_payment.to_account_info(),
                    vault_authority: ctx.accounts.vault_authority.to_account_info(),
                    token_mint: ctx.accounts.token_mint.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
                post_pot_authority_seeds,
            ),
            creator_fee,
        )?;

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

        // Transfer from post pot (OM-owned) to protocol treasury (Fed-owned) via Fed CPI
        // This ensures proper separation of concerns - Fed handles all transfers to its treasury
        // post_pot_authority is a PDA, so we need to sign with seeds
        let post_key = ctx.accounts.post.key();
        let (_, post_pot_bump) = Pubkey::find_program_address(
            &[POST_POT_AUTHORITY_SEED, post_key.as_ref()],
            ctx.program_id,
        );
        let post_pot_authority_seeds: &[&[&[u8]]] =
            &[&[POST_POT_AUTHORITY_SEED, post_key.as_ref(), &[post_pot_bump]]];

        fed::cpi::transfer_into_fed_treasury_account(
            CpiContext::new_with_signer(
                ctx.accounts.fed_program.to_account_info(),
                fed::cpi::accounts::TransferIntoFedTreasuryAccount {
                    from: ctx.accounts.post_pot_token_account.to_account_info(),
                    from_authority: ctx.accounts.post_pot_authority.to_account_info(),
                    protocol_treasury_token_account: ctx
                        .accounts
                        .protocol_token_treasury_token_account
                        .to_account_info(),
                    valid_payment: ctx.accounts.valid_payment.to_account_info(),
                    fed_config: ctx.accounts.fed_config.to_account_info(),
                    token_mint: ctx.accounts.token_mint.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                },
                post_pot_authority_seeds,
            ),
            protocol_fee,
        )?;

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

        let parent_post = &ctx.accounts.parent_post;
        msg!(
            "Distributing mother post fee: {} to parent post: {}",
            mother_fee,
            parent_post.key()
        );
        // Transfer from child post pot to parent post pot (post pots are owned by OM, so handle directly)
        let post_key = ctx.accounts.post.key();
        let (_, post_pot_bump) = Pubkey::find_program_address(
            &[POST_POT_AUTHORITY_SEED, post_key.as_ref()],
            ctx.program_id,
        );
        let post_pot_authority_seeds: &[&[&[u8]]] =
            &[&[POST_POT_AUTHORITY_SEED, post_key.as_ref(), &[post_pot_bump]]];

        // not a CPI because we are not transferring money to the fed - we are just sending it to another post pot.
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.post_pot_token_account.to_account_info(),
                    to: ctx.accounts.parent_post_pot_token_account.to_account_info(),
                    authority: ctx.accounts.post_pot_authority.to_account_info(),
                },
                post_pot_authority_seeds,
            ),
            mother_fee,
        )?;

        msg!("✅ Parent post share distributed successfully");

        Ok(())
    }

    pub fn claim_post_reward(ctx: Context<ClaimPostReward>, post_id_hash: [u8; 32]) -> Result<()> {
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        // Auth: session or wallet via CPI
        persona::cpi::check_session_or_wallet(
            CpiContext::new(
                ctx.accounts.persona_program.to_account_info(),
                persona::cpi::accounts::CheckSessionOrWallet {
                    user: ctx.accounts.user.to_account_info(),
                    session_key: ctx.accounts.session_key.to_account_info(),
                    session_authority: ctx.accounts.session_authority.to_account_info(),
                },
            ),
            now,
        )?;
        let post = &ctx.accounts.post;
        let pos = &mut ctx.accounts.position;
        let claim = &mut ctx.accounts.voter_post_mint_claim;
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

        // Transfer from post pot to user vault (post pot is owned by OM, so handle directly)
        let post_key = post.key();
        let (_, post_pot_bump) = Pubkey::find_program_address(
            &[POST_POT_AUTHORITY_SEED, post_key.as_ref()],
            ctx.program_id,
        );
        let post_pot_authority_seeds: &[&[&[u8]]] =
            &[&[POST_POT_AUTHORITY_SEED, post_key.as_ref(), &[post_pot_bump]]];

        fed::cpi::transfer_into_fed_user_account(
            CpiContext::new_with_signer(
                ctx.accounts.fed_program.to_account_info(),
                fed::cpi::accounts::TransferIntoFedUserAccount {
                    from: ctx.accounts.post_pot_token_account.to_account_info(),
                    from_authority: ctx.accounts.post_pot_authority.to_account_info(),
                    user: ctx.accounts.user.to_account_info(),
                    to_user_vault_token_account: ctx
                        .accounts
                        .user_vault_token_account
                        .to_account_info(),
                    valid_payment: ctx.accounts.valid_payment.to_account_info(),
                    vault_authority: ctx.accounts.vault_authority.to_account_info(),
                    token_mint: ctx.accounts.token_mint.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
                post_pot_authority_seeds,
            ),
            reward,
        )?;

        // anchor_spl::token::transfer(
        //     CpiContext::new_with_signer(
        //         ctx.accounts.token_program.to_account_info(),
        //         anchor_spl::token::Transfer {
        //             from: ctx.accounts.post_pot_token_account.to_account_info(),
        //             to: ctx.accounts.user_vault_token_account.to_account_info(),
        //             authority: ctx.accounts.post_pot_authority.to_account_info(),
        //         },
        //         post_pot_authority_seeds,
        //     ),
        //     reward,
        // )?;

        claim.claimed = true;
        Ok(())
    }

    pub fn resurrect(ctx: Context<Resurrect>) -> Result<()> {
        // authenticate
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;
        persona::cpi::check_session_or_wallet(
            CpiContext::new(
                ctx.accounts.persona_program.to_account_info(),
                persona::cpi::accounts::CheckSessionOrWallet {
                    user: ctx.accounts.user.to_account_info(),
                    session_key: ctx.accounts.session_key.to_account_info(),
                    session_authority: ctx.accounts.session_authority.to_account_info(),
                },
            ),
            now,
        )?;

        // the idea is that if you pay in usd, it will be cheap, but if you want to pay in bling, it will be very pricey
        let resurrection_fee_in_dollars = ctx.accounts.om_config.resurrection_fee;
        let resurrection_fee_in_dollars_with_bling_premium =
            ctx.accounts.om_config.resurrection_fee_bling_premium;
        // Transfer tokens from the user's vault to the protocol treasury
        fed::cpi::convert_dollar_with_bling_premium_and_charge_to_protocol_treasury(
            CpiContext::new(
                ctx.accounts.fed_program.to_account_info(),
                fed::cpi::accounts::ConvertDollarAndChargeToProtocolTreasury {
                    user: ctx.accounts.user.to_account_info(),
                    from_user_vault_token_account: ctx
                        .accounts
                        .user_vault_token_account
                        .to_account_info(),
                    protocol_treasury_token_account: ctx
                        .accounts
                        .protocol_token_treasury_token_account
                        .to_account_info(),
                    valid_payment: ctx.accounts.valid_payment.to_account_info(),
                    token_mint: ctx.accounts.token_mint.to_account_info(),
                    fed_config: ctx.accounts.fed_config.to_account_info(),
                    vault_authority: ctx.accounts.vault_authority.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                },
            ),
            resurrection_fee_in_dollars,
            resurrection_fee_in_dollars_with_bling_premium,
        )?;

        let body = &mut ctx.accounts.voter_account.body;
        let is_dead = body.is_dead();
        if !is_dead {
            return Err(ErrorCode::NotDead.into());
        }
        let new_body = body.resurrect();
        body.health = new_body.health;
        body.energy = new_body.energy;

        Ok(())
    }

    /// Apply a permanent effect directly to canonical voter state.
    /// Effects are mutations, not stored state. They are applied at write-time.
    pub fn apply_mutation(ctx: Context<ApplyMutation>, effect: PermanentEffect) -> Result<()> {
        // 1. Validate user matches voter account
        require!(
            ctx.accounts.target_user.key() == ctx.accounts.target_user_voter_account.voter,
            ErrorCode::Unauthorized
        );

        // 2. Apply effect directly to canonical state
        ctx.accounts.target_user_voter_account.apply_effect(effect);

        Ok(())
    }
}

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
    #[msg("Invalid post relation")]
    InvalidRelation,
    #[msg("Answer must target a Question post")]
    AnswerMustTargetQuestion,
    #[msg("Answer target must be a Root post")]
    AnswerTargetNotRoot,
    #[msg("Zero tip amount not allowed")]
    ZeroTipAmount,
    #[msg("Cannot tip yourself")]
    CannotTipSelf,
    #[msg("No tips to claim")]
    NoTipsToClaim,
    #[msg("Zero amount not allowed")]
    ZeroAmount,
    #[msg("Cannot send tokens to yourself")]
    CannotSendToSelf,
    #[msg("Token is not withdrawable")]
    TokenNotWithdrawable,
    #[msg("User is not dead")]
    NotDead,
    #[msg("Unauthorized modifier issuer")]
    UnauthorizedModifierIssuer,
    #[msg("Unauthorized issuer")]
    UnauthorizedIssuer,
}
