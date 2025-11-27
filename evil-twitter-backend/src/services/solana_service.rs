use anchor_client::Client;
use anchor_client::Cluster;
use anchor_client::Program;

use anchor_lang::Idl;

use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::commitment_config::CommitmentConfig;
use solana_sdk::{
    instruction::Instruction, pubkey::Pubkey, signature::Keypair, transaction::Transaction,
};
use std::sync::Arc;

pub struct SolanaService {
    rpc: Arc<RpcClient>,
    payer: Arc<Keypair>,
}

impl SolanaService {
    pub fn new(rpc: Arc<RpcClient>, payer: Arc<Keypair>) -> Self {
        Self { rpc, payer }
    }

    fn program(&self) -> Program<Arc<Keypair>> {
        let client = Client::new_with_options(
            Cluster::Localnet,
            self.payer.clone(),
            CommitmentConfig::confirmed(),
        );
        let idl: Idl = serde_json::from_str(include_str!("idl/opinions_market.json"))?;
        let program = client.program_with_idl(program_id, idl)?;
        program
    }

    pub fn build_ping_tx(&self) -> anyhow::Result<String> {
        let program = self.program();
        let ix = program.methods().ping().instruction()?;

        let blockhash = self.rpc.get_latest_blockhash()?;
        let mut tx = Transaction::new_with_payer(&[ix], Some(&self.payer.pubkey()));
        tx.partial_sign(&[self.payer.as_ref()], blockhash);

        Ok(base64::encode(tx.serialize()))
    }

    pub fn build_create_user_tx(&self, user_wallet: Pubkey) -> anyhow::Result<(String, Pubkey)> {
        let program = self.program();
        let (user_account_pda, _) = get_user_account_pda(&PROGRAM_ID, &user_wallet);
        let (config_pda, _) = get_config_pda(&PROGRAM_ID);

        let ix = program
            .methods()
            .create_user()
            .accounts(CreateUser {
                config: config_pda,
                user: user_wallet,
                payer: self.payer.pubkey(),
                user_account: user_account_pda,
                system_program: system_program::ID,
            })
            .instruction()?;

        let blockhash = self.rpc.get_latest_blockhash()?;
        let mut tx = Transaction::new_with_payer(&[ix], Some(&self.payer.pubkey()));
        tx.partial_sign(&[self.payer.as_ref()], blockhash);

        Ok((base64::encode(tx.serialize()), user_account_pda))
    }
}
