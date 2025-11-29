// import * as anchor from "@coral-xyz/anchor";

// import { OpinionsMarket as OpinionsMarketType } from "./types/opinions_market";
// import OpinionsMarketIdl from "./idl/opinions_market.json";

// import {
//   ASSOCIATED_TOKEN_PROGRAM_ID,
//   createTransferCheckedInstruction,
//   getAssociatedTokenAddress,
//   getOrCreateAssociatedTokenAccount,
//   TOKEN_PROGRAM_ID,
// } from "@solana/spl-token";
// import { PublicKey, Signer } from "@solana/web3.js";

// import Common from "./common";
// import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";

// const SOL_SCALE = 10 ** 9;

// export default class ProofOfReserves {
//   common: Common;
//   opinionsMarketProgram: anchor.Program<OpinionsMarketType>;

//   constructor(
//     common: Common,
//     opinionsMarketProgram: anchor.Program<OpinionsMarketType>
//   ) {
//     this.common = common;
//     this.opinionsMarketProgram = opinionsMarketProgram;
//   }

//   // -------------------------------------------------------------------------
//   // DEPOSIT & WITHDRAW
//   // -------------------------------------------------------------------------

//   /**
//    * Derive PDAs for opinions market program
//    */
//   async getOpinionsMarketPdas(
//     user: PublicKey,
//     tokenMint: PublicKey
//   ): Promise<{
//     userAccount: PublicKey;
//     userVaultTokenAccount: PublicKey;
//     vaultAuthority: PublicKey;
//     validPayment: PublicKey;
//     config: PublicKey;
//   }> {
//     const USER_ACCOUNT_SEED = Buffer.from("user_account");
//     const USER_VAULT_TOKEN_ACCOUNT_SEED = Buffer.from(
//       "user_vault_token_account"
//     );
//     const VAULT_AUTHORITY_SEED = Buffer.from("vault_authority");
//     const VALID_PAYMENT_SEED = Buffer.from("valid_payment");
//     const CONFIG_SEED = Buffer.from("config");

//     const [userAccount] = PublicKey.findProgramAddressSync(
//       [USER_ACCOUNT_SEED, user.toBuffer()],
//       this.opinionsMarketProgram.programId
//     );

//     const [userVaultTokenAccount] = PublicKey.findProgramAddressSync(
//       [USER_VAULT_TOKEN_ACCOUNT_SEED, user.toBuffer(), tokenMint.toBuffer()],
//       this.opinionsMarketProgram.programId
//     );

//     const [vaultAuthority] = PublicKey.findProgramAddressSync(
//       [VAULT_AUTHORITY_SEED],
//       this.opinionsMarketProgram.programId
//     );

//     const [validPayment] = PublicKey.findProgramAddressSync(
//       [VALID_PAYMENT_SEED, tokenMint.toBuffer()],
//       this.opinionsMarketProgram.programId
//     );

//     const [config] = PublicKey.findProgramAddressSync(
//       [CONFIG_SEED],
//       this.opinionsMarketProgram.programId
//     );

//     return {
//       userAccount,
//       userVaultTokenAccount,
//       vaultAuthority,
//       validPayment,
//       config,
//     };
//   }

//   /**
//    * Build deposit instruction
//    * @param user User's public key (must be signer)
//    * @param tokenMint Token mint to deposit
//    * @param amount Amount in token units (will be converted to lamports with 9 decimals)
//    */
//   async buildDepositIx(
//     user: PublicKey,
//     tokenMint: PublicKey,
//     amount: number
//   ): Promise<anchor.web3.TransactionInstruction> {
//     const pdas = await this.getOpinionsMarketPdas(user, tokenMint);

//     // Get user's token ATA (source)
//     const userTokenAta = await getAssociatedTokenAddress(tokenMint, user);

//     // Convert amount to lamports (assuming 9 decimals)
//     const amountInLamports = BigInt(Math.floor(amount * 1_000_000_000));

//     console.log("Building deposit instruction:", {
//       user: user.toBase58(),
//       tokenMint: tokenMint.toBase58(),
//       amount: amountInLamports.toString(),
//       userTokenAta: userTokenAta.toBase58(),
//       userVaultTokenAccount: pdas.userVaultTokenAccount.toBase58(),
//     });

//     const depositIx = await this.opinionsMarketProgram.methods
//       .deposit(new anchor.BN(amountInLamports.toString()))
//       .accountsPartial({
//         user: user,
//         userAccount: pdas.userAccount,
//         tokenMint: tokenMint,
//         validPayment: pdas.validPayment,
//         userTokenAta: userTokenAta,
//         vaultAuthority: pdas.vaultAuthority,
//         userVaultTokenAccount: pdas.userVaultTokenAccount,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         systemProgram: SYSTEM_PROGRAM_ID,
//       })
//       .instruction();

//     return depositIx;
//   }

//   /**
//    * Execute deposit transaction
//    * @param user User's signer (must sign transaction and pay fees)
//    * @param tokenMint Token mint to deposit
//    * @param amount Amount in token units
//    * @returns Transaction signature
//    */
//   async deposit(
//     user: Signer,
//     tokenMint: PublicKey,
//     amount: number
//   ): Promise<string> {
//     const depositIx = await this.buildDepositIx(
//       user.publicKey,
//       tokenMint,
//       amount
//     );

//     const transaction = new anchor.web3.Transaction().add(depositIx);
//     transaction.feePayer = user.publicKey;

//     const tx = await anchor.web3.sendAndConfirmTransaction(
//       this.common.connection,
//       transaction,
//       [user],
//       {
//         commitment: "confirmed",
//       }
//     );

//     console.info("Deposit transaction:", tx);
//     return tx;
//   }

//   /**
//    * Build withdraw instruction
//    * @param user User's public key (must be signer)
//    * @param tokenMint Token mint to withdraw
//    * @param amount Amount in token units (will be converted to lamports with 9 decimals)
//    */
//   async buildWithdrawIx(
//     user: PublicKey,
//     tokenMint: PublicKey,
//     amount: number
//   ): Promise<anchor.web3.TransactionInstruction> {
//     const pdas = await this.getOpinionsMarketPdas(user, tokenMint);

//     // Get user's token ATA (destination)
//     const userTokenDestAta = await getAssociatedTokenAddress(tokenMint, user);

//     // Convert amount to lamports (assuming 9 decimals)
//     const amountInLamports = BigInt(Math.floor(amount * 1_000_000_000));

//     console.log("Building withdraw instruction:", {
//       user: user.toBase58(),
//       tokenMint: tokenMint.toBase58(),
//       amount: amountInLamports.toString(),
//       userTokenDestAta: userTokenDestAta.toBase58(),
//       userVaultTokenAccount: pdas.userVaultTokenAccount.toBase58(),
//     });

//     const withdrawIx = await this.opinionsMarketProgram.methods
//       .withdraw(new anchor.BN(amountInLamports.toString()))
//       .accountsPartial({
//         user: user,
//         userAccount: pdas.userAccount,
//         tokenMint: tokenMint,
//         userTokenDestAta: userTokenDestAta,
//         userVaultTokenAccount: pdas.userVaultTokenAccount,
//         vaultAuthority: pdas.vaultAuthority,
//         tokenProgram: TOKEN_PROGRAM_ID,
//       })
//       .instruction();

//     return withdrawIx;
//   }

//   /**
//    * Execute withdraw transaction
//    * @param user User's signer (must sign transaction and pay fees)
//    * @param tokenMint Token mint to withdraw
//    * @param amount Amount in token units
//    * @returns Transaction signature
//    */
//   async withdraw(
//     user: Signer,
//     tokenMint: PublicKey,
//     amount: number
//   ): Promise<string> {
//     const withdrawIx = await this.buildWithdrawIx(
//       user.publicKey,
//       tokenMint,
//       amount
//     );

//     const transaction = new anchor.web3.Transaction().add(withdrawIx);
//     transaction.feePayer = user.publicKey;

//     const tx = await anchor.web3.sendAndConfirmTransaction(
//       this.common.connection,
//       transaction,
//       [user],
//       {
//         commitment: "confirmed",
//       }
//     );

//     console.info("Withdraw transaction:", tx);
//     return tx;
//   }
// }
