use anchor_client::Client;
use anchor_client::Cluster;
use anchor_client::Program;

use serde_json::Value;

use anchor_client::anchor_lang::prelude::*;

use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::commitment_config::CommitmentConfig;
use solana_sdk::{
    instruction::Instruction, pubkey::Pubkey, signature::Keypair, transaction::Transaction,
};
use std::sync::Arc;

use opinions_market::accounts::Ping;
use opinions_market::instruction::Ping;

pub struct SolanaService {
    rpc: Arc<RpcClient>,
    payer: Arc<Keypair>,
}

fn read_program_id_from_idl() -> Pubkey {
    let raw = include_str!("../solana/idl/opinions_market.json");
    let v: Value = serde_json::from_str(raw).unwrap();

    let addr = v["metadata"]["address"]
        .as_str()
        .expect("address field missing in IDL");

    addr.parse().unwrap()
}

impl SolanaService {
    pub fn new(rpc: Arc<RpcClient>, payer: Arc<Keypair>) -> Self {
        Self { rpc, payer }
    }
    fn opinions_market_program(&self) -> Program<Arc<Keypair>> {
        let payer = self.payer.clone();
        let client = Client::new_with_options(
            Cluster::Localnet,
            payer.clone(),
            CommitmentConfig::confirmed(),
        );

        let program_id = read_program_id_from_idl();
        println!("program_id: {}", program_id);

        let program = client.program(program_id).unwrap();

        program
    }

    pub fn build_ping_tx(&self) -> anyhow::Result<String> {
        let opinions_market = self.opinions_market_program();
        let ix = opinions_market
            .request()
            .accounts(opinions_market::accounts::Ping {})
            .args(opinions_market::instruction::Ping {})
            .instructions()
            .unwrap();

        let blockhash = self.rpc.get_latest_blockhash()?;
        let mut tx = Transaction::new_with_payer(&[ix], Some(&self.payer.pubkey()));
        tx.partial_sign(&[self.payer.as_ref()], blockhash);

        Ok(base64::encode(tx.serialize()))
    }

    pub fn build_create_user_tx(&self, user_wallet: Pubkey) -> anyhow::Result<(String, Pubkey)> {
        let opinions_market = self.opinions_market_program();
        let (user_account_pda, _) = get_user_account_pda(&opinions_market::ID, &user_wallet);
        let (config_pda, _) = get_config_pda(&PROGRAM_ID);

        let ix = opinions_market
            .request()
            .accounts(opinions_market::accounts::CreateUser {
                config: config_pda,
                user: user_wallet,
                payer: self.payer.pubkey(),
                user_account: user_account_pda,
                system_program: system_program::ID,
            })
            .args(opinions_market::instruction::CreateUser {})
            .instructions()
            .unwrap();

        let blockhash = self.rpc.get_latest_blockhash()?;
        let mut tx = Transaction::new_with_payer(&[ix], Some(&self.payer.pubkey()));
        tx.partial_sign(&[self.payer.as_ref()], blockhash);

        Ok((base64::encode(tx.serialize()), user_account_pda))
    }
}
