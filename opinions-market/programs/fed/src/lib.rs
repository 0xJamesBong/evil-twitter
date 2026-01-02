use crate::pda_seeds::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;

pub mod instructions;
pub mod math;
pub mod pda_seeds;
pub mod states;

use instructions::*;
use states::*;

declare_id!("6p4L4eVGQtzYEnYFnSrEFGaZMqsrx7r1Emd5aPBAXXzC");

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
    #[msg("Invalid from account - must be Fed-owned for transfer_out_of_fed")]
    InvalidFrom,
    #[msg("Invalid vault authority")]
    BadAuthority,
    #[msg("Invalid to account - must be Fed-owned for transfer_into_fed")]
    InvalidTo,
}

#[program]
pub mod fed {

    use crate::math::token_conversion::convert_dollar_to_token_lamports;

    use super::*;
    // Don't import from instructions module - use re-exports from crate root

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let cfg = &mut ctx.accounts.fed_config;

        let new_cfg = FedConfig::new(
            *ctx.accounts.admin.key,
            ctx.accounts.payer.key(),
            ctx.accounts.bling_mint.key(),
            ctx.bumps.fed_config,
            [0; 7],
        );

        cfg.admin = new_cfg.admin;
        cfg.payer_authroity = new_cfg.payer_authroity;
        cfg.bling_mint = new_cfg.bling_mint;

        cfg.bump = new_cfg.bump;
        cfg.padding = new_cfg.padding;

        let valid_payment = &mut ctx.accounts.valid_payment;

        let new_valid_payment = ValidPayment::new(ctx.accounts.bling_mint.key(), 1, true, false);

        valid_payment.token_mint = new_valid_payment.token_mint;
        valid_payment.price_in_dollar = new_valid_payment.price_in_dollar;
        valid_payment.enabled = new_valid_payment.enabled;
        valid_payment.withdrawable = new_valid_payment.withdrawable; // BLING is not withdrawable by default
        valid_payment.bump = ctx.bumps.valid_payment; // Use the actual bump from Anchor

        Ok(())
    }

    pub fn register_valid_payment(
        ctx: Context<RegisterValidPayment>,
        price_in_dollar: u64, // How much is 1 token in dollars
        withdrawable: bool,   // Whether this token can be withdrawn from vault
    ) -> Result<()> {
        let cfg = &ctx.accounts.fed_config;

        // Note: Duplicate registration is prevented by the `init` constraint on alternative_payment account.
        // If the account already exists (same PDA seeds), init will fail before this function is called.

        let valid_payment = &mut ctx.accounts.valid_payment;
        let new_valid_payment = ValidPayment::new(
            ctx.accounts.token_mint.key(),
            price_in_dollar,
            true,
            withdrawable,
        );

        valid_payment.token_mint = new_valid_payment.token_mint;
        valid_payment.price_in_dollar = new_valid_payment.price_in_dollar;
        valid_payment.enabled = new_valid_payment.enabled;
        valid_payment.withdrawable = new_valid_payment.withdrawable;
        valid_payment.bump = ctx.bumps.valid_payment; // Use the actual bump from Anchor

        Ok(())
    }

    /// Update the withdrawable flag for a valid payment token
    pub fn update_valid_payment_withdrawable(
        ctx: Context<ModifyAcceptedMint>,
        withdrawable: bool,
    ) -> Result<()> {
        let valid_payment = &mut ctx.accounts.accepted_mint;
        valid_payment.withdrawable = withdrawable;
        Ok(())
    }
    // /// User deposits from their wallet into the program-controlled vault.
    // pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    //     // No logic needed—Anchor already checked mint is allowed.
    //     let cpi_accounts = anchor_spl::token::Transfer {
    //         from: ctx.accounts.user_token_ata.to_account_info(),
    //         to: ctx.accounts.user_vault_token_account.to_account_info(),
    //         authority: ctx.accounts.user.to_account_info(),
    //     };
    //     let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    //     anchor_spl::token::transfer(cpi_ctx, amount)?;
    //     Ok(())
    // }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::ZeroAmount);

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

    /// Tip another user from sender's vault to recipient's tip vault.
    /// Tips accumulate in the recipient's tip vault until they claim.
    pub fn tip(ctx: Context<Tip>, amount: u64) -> Result<()> {
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        // Auth: session or wallet via CPI
        persona::cpi::check_session_or_wallet(
            CpiContext::new(
                ctx.accounts.persona_program.to_account_info(),
                persona::cpi::accounts::CheckSessionOrWallet {
                    user: ctx.accounts.sender.to_account_info(),
                    session_key: ctx.accounts.session_key.to_account_info(),
                    session_authority: ctx.accounts.session_authority.to_account_info(),
                },
            ),
            now,
        )?;

        // Validate amount
        require!(amount > 0, ErrorCode::ZeroTipAmount);

        // Validate recipient != sender
        require!(
            ctx.accounts.recipient.key() != ctx.accounts.sender_user_account.key(),
            ErrorCode::CannotTipSelf
        );

        // Initialize TipVault if needed (init_if_needed will create it if missing)
        let tip_vault = &mut ctx.accounts.tip_vault;
        let is_new = tip_vault.owner == Pubkey::default();

        if is_new {
            let new_tip_vault = TipVault::new(
                ctx.accounts.recipient.key(),
                ctx.accounts.token_mint.key(),
                ctx.bumps.tip_vault,
            );
            tip_vault.owner = new_tip_vault.owner;
            tip_vault.token_mint = new_tip_vault.token_mint;
            tip_vault.unclaimed_amount = new_tip_vault.unclaimed_amount;
            tip_vault.bump = new_tip_vault.bump;
        } else {
            // Validate existing tip vault matches recipient and mint
            require!(
                tip_vault.owner == ctx.accounts.recipient.key(),
                ErrorCode::Unauthorized
            );
            require!(
                tip_vault.token_mint == ctx.accounts.token_mint.key(),
                ErrorCode::Unauthorized
            );
        }

        // Transfer from sender's vault to tip vault
        let vault_bump = ctx.bumps.vault_authority;
        let vault_authority_seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, &[vault_bump]]];

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx
                .accounts
                .sender_user_vault_token_account
                .to_account_info(),
            to: ctx.accounts.tip_vault_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            vault_authority_seeds,
        );
        anchor_spl::token::transfer(cpi_ctx, amount)?;

        // Increment unclaimed_amount
        tip_vault.unclaimed_amount = tip_vault
            .unclaimed_amount
            .checked_add(amount)
            .ok_or(ErrorCode::MathOverflow)?;

        // Emit event
        emit!(TipReceived {
            owner: tip_vault.owner,
            sender: ctx.accounts.sender_user_account.key(),
            token_mint: ctx.accounts.token_mint.key(),
            amount,
            vault_balance: ctx.accounts.tip_vault_token_account.amount,
        });

        Ok(())
    }
    /// Claim all tips from tip vault to owner's main vault.
    /// All-or-nothing: claims entire vault balance.
    pub fn claim_tips(ctx: Context<ClaimTips>) -> Result<()> {
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        // Auth: session or wallet via CPI
        persona::cpi::check_session_or_wallet(
            CpiContext::new(
                ctx.accounts.persona_program.to_account_info(),
                persona::cpi::accounts::CheckSessionOrWallet {
                    user: ctx.accounts.owner.to_account_info(),
                    session_key: ctx.accounts.session_key.to_account_info(),
                    session_authority: ctx.accounts.session_authority.to_account_info(),
                },
            ),
            now,
        )?;

        let tip_vault = &mut ctx.accounts.tip_vault;

        // Validate tip vault owner matches
        require!(
            tip_vault.owner == ctx.accounts.user_account.key(),
            ErrorCode::Unauthorized
        );
        require!(
            tip_vault.token_mint == ctx.accounts.token_mint.key(),
            ErrorCode::Unauthorized
        );

        // Read vault balance (source of truth)
        let claim_amount = ctx.accounts.tip_vault_token_account.amount;
        require!(claim_amount > 0, ErrorCode::NoTipsToClaim);

        // Transfer from tip vault to owner's main vault
        let vault_bump = ctx.bumps.vault_authority;
        let vault_authority_seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, &[vault_bump]]];

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.tip_vault_token_account.to_account_info(),
            to: ctx
                .accounts
                .owner_user_vault_token_account
                .to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            vault_authority_seeds,
        );
        anchor_spl::token::transfer(cpi_ctx, claim_amount)?;

        // Reset unclaimed_amount
        tip_vault.unclaimed_amount = 0;

        // Emit event
        emit!(TipsClaimed {
            owner: tip_vault.owner,
            token_mint: ctx.accounts.token_mint.key(),
            amount: claim_amount,
        });

        Ok(())
    }

    /// Send tokens from sender's user vault to recipient's user vault.
    /// Direct vault-to-vault transfer without intermediate accounts.
    pub fn send_token(ctx: Context<SendToken>, amount: u64) -> Result<()> {
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        // Auth: session or wallet via CPI
        persona::cpi::check_session_or_wallet(
            CpiContext::new(
                ctx.accounts.persona_program.to_account_info(),
                persona::cpi::accounts::CheckSessionOrWallet {
                    user: ctx.accounts.sender.to_account_info(),
                    session_key: ctx.accounts.session_key.to_account_info(),
                    session_authority: ctx.accounts.session_authority.to_account_info(),
                },
            ),
            now,
        )?;
        // Validate amount
        require!(amount > 0, ErrorCode::ZeroAmount);

        // Validate recipient != sender
        require!(
            ctx.accounts.recipient.key() != ctx.accounts.sender_user_account.key(),
            ErrorCode::CannotSendToSelf
        );

        // Transfer from sender's vault to recipient's vault
        let vault_bump = ctx.bumps.vault_authority;
        let vault_authority_seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, &[vault_bump]]];

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx
                .accounts
                .sender_user_vault_token_account
                .to_account_info(),
            to: ctx
                .accounts
                .recipient_user_vault_token_account
                .to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            vault_authority_seeds,
        );
        anchor_spl::token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    /// Transfer tokens INTO Fed treasury custody.
    /// External account → Fed treasury.
    ///
    /// Invariants:
    /// - `from` is external (not Fed-owned)
    /// - `to` is Fed treasury (Fed-owned)
    /// - Mint must be enabled
    /// - Amount > 0
    pub fn transfer_into_fed_treasury_account(
        ctx: Context<TransferIntoFedTreasuryAccount>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::ZeroAmount);

        // 1. From-account must be external (not Fed-owned)
        require!(ctx.accounts.from.owner != fed::ID, ErrorCode::InvalidFrom);

        // 2. To-account must be Fed-controlled treasury
        require!(
            ctx.accounts.protocol_treasury_token_account.owner == fed::ID,
            ErrorCode::InvalidTo
        );

        // 3. Mint must be enabled
        require!(
            ctx.accounts.valid_payment.enabled,
            ErrorCode::MintNotEnabled
        );

        // For transfer_into_fed, the external account owner signs
        // No treasury authority signer needed - Fed is receiving
        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx
                .accounts
                .protocol_treasury_token_account
                .to_account_info(),
            authority: ctx.accounts.from_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        anchor_spl::token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    /// Transfer tokens INTO Fed custody.
    /// External account → Fed vault.
    ///
    /// Invariants:
    /// - `from` is external (not Fed-owned)
    /// - `to` is a Fed vault (Fed-owned)
    /// - Mint must be enabled
    /// - Amount > 0
    pub fn transfer_into_fed_user_account(
        ctx: Context<TransferIntoFedUserAccount>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::ZeroAmount);

        // 1. From-account must be external (not Fed-owned)
        require!(ctx.accounts.from.owner != fed::ID, ErrorCode::InvalidFrom);

        // 2. To-account must be Fed-controlled vault
        require!(
            ctx.accounts.to_user_vault_token_account.owner == fed::ID,
            ErrorCode::InvalidTo
        );

        // 3. Mint must be enabled
        require!(
            ctx.accounts.valid_payment.enabled,
            ErrorCode::MintNotEnabled
        );

        // For transfer_into_fed, the external account owner signs
        // No vault authority signer needed - Fed is receiving
        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to_user_vault_token_account.to_account_info(),
            authority: ctx.accounts.from_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        anchor_spl::token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    /// Transfer tokens OUT OF Fed custody.
    /// Fed vault → External account.
    ///
    /// Invariants:
    /// - `from` is a Fed vault (Fed-owned)
    /// - `to` is external (not Fed-owned, or owned by another program like OM)
    /// - Vault authority must be correct
    /// - Mint must be enabled
    /// - Amount > 0
    pub fn transfer_out_of_fed_user_account(
        ctx: Context<TransferOutOfFedUserAccount>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::ZeroAmount);

        // 1. From-account must be Fed-controlled vault
        require!(
            ctx.accounts.from_user_vault_token_account.owner == fed::ID,
            ErrorCode::InvalidFrom
        );

        // 2. To-account must be external (not Fed-owned)
        require!(ctx.accounts.to.owner != fed::ID, ErrorCode::InvalidTo);

        // // 3. Vault authority must be the Fed vault authority
        // // Anchor already verifies the PDA via #[account] constraint, but we double-check
        // let (expected_authority, _) =
        //     Pubkey::find_program_address(&[VAULT_AUTHORITY_SEED], &fed::ID);
        // require!(
        //     ctx.accounts.vault_authority.key() == expected_authority,
        //     ErrorCode::BadAuthority
        // );

        // 4. Mint must be enabled
        require!(
            ctx.accounts.valid_payment.enabled,
            ErrorCode::MintNotEnabled
        );

        // Transfer using vault authority as signer
        let authority_bump = ctx.bumps.vault_authority;
        let authority_seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, &[authority_bump]]];

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.from_user_vault_token_account.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            authority_seeds,
        );
        anchor_spl::token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    /// Convert dollar amount to token and charge from user vault to protocol treasury.
    /// If dollar_amount is 0, no charge is made.
    pub fn convert_dollar_and_charge_to_protocol_treasury(
        ctx: Context<ConvertDollarAndChargeToProtocolTreasury>,
        dollar_amount: u64,
    ) -> Result<u64> {
        // Skip if amount is 0
        if dollar_amount == 0 {
            return Ok(0);
        }

        // Convert dollar to token
        let token_amount = convert_dollar_to_token_lamports(
            dollar_amount,
            ctx.accounts.valid_payment.price_in_dollar,
            ctx.accounts.token_mint.decimals,
        )?;

        require!(token_amount > 0, ErrorCode::ZeroAmount);

        // Check user vault has sufficient balance
        require!(
            ctx.accounts.from_user_vault_token_account.amount >= token_amount,
            ErrorCode::MathOverflow // Using MathOverflow as insufficient funds error
        );

        // Charge (transfer) from user vault to protocol treasury
        let authority_bump = ctx.bumps.vault_authority;
        let authority_seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, &[authority_bump]]];

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.from_user_vault_token_account.to_account_info(),
            to: ctx
                .accounts
                .protocol_treasury_token_account
                .to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            authority_seeds,
        );
        anchor_spl::token::transfer(cpi_ctx, token_amount)?;

        Ok(token_amount)
    }

    /// Convert dollar amount to token and transfer from user vault to external account.
    /// If dollar_amount is 0, no transfer is made.
    pub fn convert_dollar_and_transfer_out_of_fed_user_account(
        ctx: Context<ConvertDollarAndTransferOutOfFedUserAccount>,
        dollar_amount: u64,
    ) -> Result<u64> {
        // Skip if amount is 0
        if dollar_amount == 0 {
            return Ok(0);
        }

        // Convert dollar to token
        let token_amount = convert_dollar_to_token_lamports(
            dollar_amount,
            ctx.accounts.valid_payment.price_in_dollar,
            ctx.accounts.token_mint.decimals,
        )?;

        require!(token_amount > 0, ErrorCode::ZeroAmount);

        // Check user vault has sufficient balance
        require!(
            ctx.accounts.from_user_vault_token_account.amount >= token_amount,
            ErrorCode::MathOverflow // Using MathOverflow as insufficient funds error
        );

        // Transfer from user vault to destination
        let authority_bump = ctx.bumps.vault_authority;
        let authority_seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, &[authority_bump]]];

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.from_user_vault_token_account.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            authority_seeds,
        );
        anchor_spl::token::transfer(cpi_ctx, token_amount)?;

        Ok(token_amount)
    }

    // for protocols that want to transfer dollars between Fed accounts - e.g. OM tells Fed to transfer dollars to creator vault
    pub fn convert_dollar_and_transfer_out_of_fed_user_account_to_fed_user_account(
        ctx: Context<ConvertDollarAndTransferOutOfFedUserAccountToFedUserAccount>,
        dollar_amount: u64,
    ) -> Result<u64> {
        // Skip if amount is 0
        if dollar_amount == 0 {
            return Ok(0);
        }

        // Convert dollar to token
        let token_amount = convert_dollar_to_token_lamports(
            dollar_amount,
            ctx.accounts.valid_payment.price_in_dollar,
            ctx.accounts.token_mint.decimals,
        )?;

        require!(token_amount > 0, ErrorCode::ZeroAmount);

        // Check user vault has sufficient balance
        require!(
            ctx.accounts.from_user_vault_token_account.amount >= token_amount,
            ErrorCode::MathOverflow // Using MathOverflow as insufficient funds error
        );

        // Transfer from user vault to destination
        let authority_bump = ctx.bumps.vault_authority;
        let authority_seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, &[authority_bump]]];

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.from_user_vault_token_account.to_account_info(),
            to: ctx.accounts.to_user_vault_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            authority_seeds,
        );
        anchor_spl::token::transfer(cpi_ctx, token_amount)?;

        Ok(token_amount)
    }
}

#[event]
pub struct TipReceived {
    pub owner: Pubkey,
    pub sender: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub vault_balance: u64,
}

#[event]
pub struct TipsClaimed {
    pub owner: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
}
