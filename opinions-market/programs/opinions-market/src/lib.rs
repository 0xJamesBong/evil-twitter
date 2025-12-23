use crate::pda_seeds::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;
pub mod constants;
pub mod instructions;
pub mod math;

pub mod pda_seeds;
pub mod states;
use constants::*;
use instructions::*;
use states::*;

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
}

#[program]
pub mod opinions_market {

    use anchor_lang::solana_program::{ed25519_program, program::invoke};

    use anchor_lang::solana_program::sysvar::instructions::load_instruction_at_checked;

    use super::*;

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

        Ok(())
    }

    /// Core MVP voting instruction.
    /// User pays from their vault; everything is denominated in BLING.

    // pub fn create_question(ctx: Context<CreatePost>, post_id_hash: [u8; 32]) -> Result<()> {
    //     let clock = Clock::get()?;
    //     let now = clock.unix_timestamp;

    //     // ---------------------------------------------------------------------
    //     // Auth: wallet OR session
    //     // ---------------------------------------------------------------------
    //     // Auth: session or wallet via CPI
    //     persona::cpi::check_session_or_wallet(
    //         CpiContext::new(
    //             ctx.accounts.persona_program.to_account_info(),
    //             persona::cpi::accounts::CheckSessionOrWallet {
    //                 user: ctx.accounts.user.to_account_info(),
    //                 session_key: ctx.accounts.session_key.to_account_info(),
    //                 session_authority: ctx.accounts.session_authority.to_account_info(),
    //             },
    //         ),
    //         now,
    //     )?;
    //     let config = &ctx.accounts.config;
    //     let post = &mut ctx.accounts.post;

    //     // ---------------------------------------------------------------------
    //     // Enforced invariants
    //     // ---------------------------------------------------------------------
    //     let function = PostFunction::Question;
    //     let relation = PostRelation::Root;

    //     // ---------------------------------------------------------------------
    //     // Initialize PostAccount
    //     // ---------------------------------------------------------------------
    //     let new_post = PostAccount::new(
    //         ctx.accounts.user.key(),
    //         post_id_hash,
    //         function,
    //         relation,
    //         now,
    //         config,
    //         ctx.bumps.post,
    //     );

    //     // ---------------------------------------------------------------------
    //     // Write to account
    //     // ---------------------------------------------------------------------
    //     post.function = new_post.function;
    //     post.relation = new_post.relation;
    //     post.forced_outcome = None;

    //     post.creator_user = new_post.creator_user;
    //     post.post_id_hash = new_post.post_id_hash;
    //     post.start_time = new_post.start_time;
    //     post.end_time = new_post.end_time;
    //     post.state = new_post.state;
    //     post.upvotes = new_post.upvotes;
    //     post.downvotes = new_post.downvotes;
    //     post.winning_side = new_post.winning_side;
    //     post.bump = new_post.bump;
    //     post.reserved = new_post.reserved;

    //     Ok(())
    // }

    // pub fn create_answer(
    //     ctx: Context<CreateAnswer>,
    //     answer_post_id_hash: [u8; 32],
    //     _question_post_id_hash: [u8; 32],
    // ) -> Result<()> {
    //     let clock = Clock::get()?;
    //     let now = clock.unix_timestamp;

    //     // Auth: session or wallet via CPI
    //     persona::cpi::check_session_or_wallet(
    //         CpiContext::new(
    //             ctx.accounts.persona_program.to_account_info(),
    //             persona::cpi::accounts::CheckSessionOrWallet {
    //                 user: ctx.accounts.user.to_account_info(),
    //                 session_key: ctx.accounts.session_key.to_account_info(),
    //                 session_authority: ctx.accounts.session_authority.to_account_info(),
    //             },
    //         ),
    //         now,
    //     )?;
    //     let config = &ctx.accounts.config;
    //     let post = &mut ctx.accounts.post;
    //     let question = &ctx.accounts.question_post;

    //     // ---------------------------------------------------------------------
    //     // Enforced invariants (redundant safety)
    //     // ---------------------------------------------------------------------
    //     require!(
    //         question.function == PostFunction::Question,
    //         ErrorCode::AnswerMustTargetQuestion
    //     );

    //     require!(
    //         matches!(question.relation, PostRelation::Root),
    //         ErrorCode::AnswerTargetNotRoot
    //     );

    //     // ---------------------------------------------------------------------
    //     // Construct Answer
    //     // ---------------------------------------------------------------------
    //     let function = PostFunction::Answer;
    //     let relation = PostRelation::AnswerTo {
    //         question: question.key(),
    //     };

    //     let new_post = PostAccount::new(
    //         ctx.accounts.user.key(),
    //         answer_post_id_hash,
    //         function,
    //         relation,
    //         now,
    //         config,
    //         ctx.bumps.post,
    //     );

    //     // ---------------------------------------------------------------------
    //     // Write
    //     // ---------------------------------------------------------------------
    //     post.function = new_post.function;
    //     post.relation = new_post.relation;
    //     post.forced_outcome = None; // may be set later by question owner

    //     post.creator_user = new_post.creator_user;
    //     post.post_id_hash = new_post.post_id_hash;
    //     post.start_time = new_post.start_time;
    //     post.end_time = new_post.end_time;
    //     post.state = new_post.state;
    //     post.upvotes = new_post.upvotes;
    //     post.downvotes = new_post.downvotes;
    //     post.winning_side = new_post.winning_side;
    //     post.bump = new_post.bump;
    //     post.reserved = new_post.reserved;

    //     Ok(())
    // }

    //

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

        // Check if transfer is compliant with fed economic policy
        fed::cpi::check_transfer(CpiContext::new(
            ctx.accounts.fed_program.to_account_info(),
            fed::cpi::accounts::CheckTransfer {
                from: ctx
                    .accounts
                    .voter_user_vault_token_account
                    .to_account_info(),
                to: ctx.accounts.post_pot_token_account.to_account_info(),
                valid_payment: ctx.accounts.valid_payment.to_account_info(),
                token_mint: ctx.accounts.token_mint.to_account_info(),
            },
        ))?;

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
        // ---- 1. Compute BLING cost ----
        //

        let vote = Vote::new(side, valid_votes, ctx.accounts.voter.key(), post.key());
        // get karma from persona

        let voter_account = ctx.accounts.voter_account.as_ref();
        let cost_bling = vote.compute_cost_in_bling(post, pos, voter_account)?;

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
        // let (protocol_fee_token, creator_pump_fee_token, pot_increment_token) =
        //     if ctx.accounts.token_mint.key() == ctx.accounts.om_config.bling_mint {
        //         // Already in BLING, no conversion needed
        //         (protocol_fee, creator_pump_fee, pot_increment)
        //     } else {
        //         // Convert from BLING to selected token using ValidPayment price
        //         let price_in_bling = fed::cpi::bling_to_token(
        //             CpiContext::new(
        //                 ctx.accounts.fed_program.to_account_info(),
        //                 fed::cpi::accounts::BlingToToken {
        //                     valid_payment: ctx.accounts.valid_payment.to_account_info(),
        //                     token_mint: ctx.accounts.token_mint.to_account_info(),
        //                 },
        //             ),
        //             protocol_fee,
        //         )?;

        //         convert_bling_fees_to_token(
        //             protocol_fee,
        //             creator_pump_fee,
        //             pot_increment,
        //             price_in_bling,
        //             token_decimals,
        //         )?
        //     };

        // msg!("protocol_fee_token: {}", protocol_fee_token);
        // msg!("creator_pump_fee_token: {}", creator_pump_fee_token);
        // msg!("pot_increment_token: {}", pot_increment_token);

        //
        // ---- 2. TRANSFERS via Fed (all in BLING) ----
        //

        // Protocol fee transfer (Fed vault → OM treasury)
        if protocol_fee > 0 {
            fed::cpi::convert_bling_and_charge_to_protocol_treasury(
                CpiContext::new(
                    ctx.accounts.fed_program.to_account_info(),
                    fed::cpi::accounts::ConvertBlingAndChargeToProtocolTreasury {
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
            fed::cpi::convert_bling_and_transfer_out_of_fed_user_account(
                CpiContext::new(
                    ctx.accounts.fed_program.to_account_info(),
                    fed::cpi::accounts::ConvertBlingAndTransferOutOfFedUserAccount {
                        user_from: ctx.accounts.voter.to_account_info(),
                        user: ctx.accounts.voter.to_account_info(),
                        from_user_vault_token_account: ctx
                            .accounts
                            .voter_user_vault_token_account
                            .to_account_info(),
                        to: ctx.accounts.creator_vault_token_account.to_account_info(),
                        valid_payment: ctx.accounts.valid_payment.to_account_info(),
                        token_mint: ctx.accounts.token_mint.to_account_info(),
                        vault_authority: ctx.accounts.vault_authority.to_account_info(),
                        token_program: ctx.accounts.token_program.to_account_info(),
                    },
                ),
                creator_pump_fee,
            )?;
        }

        // Pot increment transfer (Fed vault → OM post pot)
        // Note: pot_increment is in BLING, function will convert to token
        if pot_increment > 0 {
            fed::cpi::convert_bling_and_transfer_out_of_fed_user_account(
                CpiContext::new(
                    ctx.accounts.fed_program.to_account_info(),
                    fed::cpi::accounts::ConvertBlingAndTransferOutOfFedUserAccount {
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

    /// Distribute creator reward from frozen settlement.
    /// Reads creator_fee from PostMintPayout and transfers it to creator's vault.
    // pub fn distribute_creator_reward(
    //     ctx: Context<DistributeCreatorReward>,
    //     post_id_hash: [u8; 32],
    // ) -> Result<()> {
    //     let payout = &ctx.accounts.post_mint_payout;
    //     require!(payout.frozen, ErrorCode::PostNotSettled);

    //     let creator_fee = payout.creator_fee;
    //     if creator_fee == 0 {
    //         msg!("No creator fee to distribute");
    //         return Ok(());
    //     }

    //     msg!("Distributing creator fee: {}", creator_fee);

    //     // Transfer from post pot to creator vault (post pot is owned by OM, so handle directly)
    //     let post_key = ctx.accounts.post.key();
    //     let (_, post_pot_bump) = Pubkey::find_program_address(
    //         &[POST_POT_AUTHORITY_SEED, post_key.as_ref()],
    //         ctx.program_id,
    //     );
    //     let post_pot_authority_seeds: &[&[&[u8]]] =
    //         &[&[POST_POT_AUTHORITY_SEED, post_key.as_ref(), &[post_pot_bump]]];

    //     fed::cpi::transfer(CpiContext::new(
    //         ctx.accounts.fed_program.to_account_info(),
    //         fed::cpi::accounts::Transfer {
    //             from: ctx.accounts.post_pot_token_account.to_account_info(),
    //             to: ctx.accounts.creator_vault_token_account.to_account_info(),
    //         },
    //     ))?;
    //     //     let cpi = CpiContext::new_with_signer(
    //     //         ctx.accounts.token_program.to_account_info(),
    //     //         anchor_spl::token::Transfer {
    //     //             from: ctx.accounts.post_pot_token_account.to_account_info(),
    //     //             to: ctx.accounts.creator_vault_token_account.to_account_info(),
    //     //             authority: ctx.accounts.post_pot_authority.to_account_info(),
    //     //         },
    //     //         seeds,
    //     //     );

    //     msg!("✅ Creator reward distributed successfully");

    //     Ok(())
    // }

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

        // Transfer from post pot to protocol treasury (post pot is owned by OM, so handle directly)
        let post_key = ctx.accounts.post.key();
        let (_, post_pot_bump) = Pubkey::find_program_address(
            &[POST_POT_AUTHORITY_SEED, post_key.as_ref()],
            ctx.program_id,
        );
        let post_pot_authority_seeds: &[&[&[u8]]] =
            &[&[POST_POT_AUTHORITY_SEED, post_key.as_ref(), &[post_pot_bump]]];

        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.post_pot_token_account.to_account_info(),
                    to: ctx
                        .accounts
                        .protocol_token_treasury_token_account
                        .to_account_info(),
                    authority: ctx.accounts.post_pot_authority.to_account_info(),
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

        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.post_pot_token_account.to_account_info(),
                    to: ctx.accounts.user_vault_token_account.to_account_info(),
                    authority: ctx.accounts.post_pot_authority.to_account_info(),
                },
                post_pot_authority_seeds,
            ),
            reward,
        )?;

        // {
        //     // Transfer reward
        //     let post_key = post.key();
        //     let (_, bump) = Pubkey::find_program_address(
        //         &[POST_POT_AUTHORITY_SEED, post_key.as_ref()],
        //         ctx.program_id,
        //     );

        //     let bump_array = [bump];
        //     let seeds_array = [POST_POT_AUTHORITY_SEED, post_key.as_ref(), &bump_array];
        //     let seeds: &[&[&[u8]]] = &[&seeds_array];

        //     let cpi = CpiContext::new_with_signer(
        //         ctx.accounts.token_program.to_account_info(),
        //         anchor_spl::token::Transfer {
        //             from: ctx.accounts.post_pot_token_account.to_account_info(),
        //             to: ctx.accounts.user_vault_token_account.to_account_info(),
        //             authority: ctx.accounts.post_pot_authority.to_account_info(),
        //         },
        //         seeds,
        //     );

        //     anchor_spl::token::transfer(cpi, reward)?;
        // }

        claim.claimed = true;
        Ok(())
    }
}
