use anchor_lang::InstructionData;
use anchor_lang::ToAccountMetas;
use anchor_lang::prelude::*;
use solana_sdk::{
    instruction::Instruction, pubkey::Pubkey, signature::Keypair, transaction::Transaction,
};
use std::sync::Arc;

pub struct SolanaService {
    pub program: Arc<anchor_client::Program>,
}

impl SolanaService {
    pub fn new(program: Arc<anchor_client::Program>) -> Self {
        Self { program }
    }

    pub fn build_ping_tx(&self) -> anyhow::Result<String> {
        let ix = Instruction {
            program_id: self.program_id,
            accounts: vec![],
            data: vec![],
        };

        // create transaction with backend as fee payer
        let recent_blockhash = self.program.rpc().get_latest_blockhash()?;

        let mut tx = Transaction::new_with_payer(&[ix], Some(&payer.pubkey()));
        tx.partial_sign(&[payer], recent_blockhash); // only backend signs

        let serialized = bincode::serialize(&tx)?;
        let base64_tx = base64::encode(serialized);

        Ok(base64_tx)
    }
    /// Build partially-signed CreateUser transaction
    pub fn build_create_user_tx(&self, user_wallet: Pubkey) -> anyhow::Result<String> {
        // derive PDAs
        let (config_pda, _) = Pubkey::find_program_address(&[b"config"], &self.program_id);
        let (user_account_pda, _) = Pubkey::find_program_address(
            &[b"user_account", user_wallet.as_ref()],
            &self.program_id,
        );

        // backend payer signer
        let payer = self.program.payer(); // Keypair

        // Build instruction using anchor constructs
        let accounts = opinions_market::accounts::CreateUser {
            user: user_wallet,
            payer: payer.pubkey(),
            user_account: user_account_pda,
            config: config_pda,
            system_program: solana_sdk::system_program::id(),
        }
        .to_account_metas(None);

        let data = opinions_market::instruction::CreateUser {}.data();

        let ix = Instruction {
            program_id: self.program_id,
            accounts,
            data,
        };

        // create transaction with backend as fee payer
        let recent_blockhash = self.program.rpc().get_latest_blockhash()?;

        let mut tx = Transaction::new_with_payer(&[ix], Some(&payer.pubkey()));
        tx.partial_sign(&[payer], recent_blockhash); // only backend signs

        let serialized = bincode::serialize(&tx)?;
        let base64_tx = base64::encode(serialized);

        Ok(base64_tx)
    }
}
