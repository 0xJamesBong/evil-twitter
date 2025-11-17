use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct PrivyService {
    client: Client,
    app_id: String,
    app_secret: String,
    api_url: String,
}

#[derive(Debug, Deserialize)]
pub struct PrivyUser {
    pub id: String, // Privy DID
    pub email: Option<PrivyEmail>,
    pub wallet: Option<PrivyWallet>,
    pub wallets: Vec<PrivyWallet>,
}

#[derive(Debug, Deserialize)]
pub struct PrivyEmail {
    pub address: String,
}

#[derive(Debug, Deserialize)]
pub struct PrivyWallet {
    pub address: String,
    pub wallet_client_type: String, // "privy" for embedded, "metamask", "phantom", etc. for external
    pub chain_type: String,         // "solana", "ethereum", etc.
}

#[derive(Debug, Deserialize)]
struct PrivyVerifyTokenResponse {
    #[serde(rename = "userId")]
    user_id: String,
}

#[derive(Debug, Serialize)]
struct PrivyGetUserRequest {
    #[serde(rename = "userId")]
    user_id: String,
}

impl PrivyService {
    pub fn new(app_id: String, app_secret: String) -> Self {
        Self {
            client: Client::new(),
            app_id,
            app_secret,
            api_url: std::env::var("PRIVY_API_URL")
                .unwrap_or_else(|_| "https://auth.privy.io/api/v1".to_string()),
        }
    }

    /// Verify a Privy access token and return the user ID (DID)
    pub async fn verify_access_token(&self, token: &str) -> Result<String> {
        let url = format!("{}/users/verify-token", self.api_url);

        let response = self
            .client
            .post(&url)
            .header("privy-app-id", &self.app_id)
            .header("privy-app-secret", &self.app_secret)
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({ "accessToken": token }))
            .send()
            .await
            .context("Failed to send request to Privy API")?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("Privy API error ({}): {}", status, body);
        }

        let result: PrivyVerifyTokenResponse = response
            .json()
            .await
            .context("Failed to parse Privy verify token response")?;

        Ok(result.user_id)
    }

    /// Get full user object from Privy by user ID (DID)
    pub async fn get_user_by_id(&self, user_id: &str) -> Result<PrivyUser> {
        let url = format!("{}/users/{}", self.api_url, user_id);

        let response = self
            .client
            .get(&url)
            .header("privy-app-id", &self.app_id)
            .header("privy-app-secret", &self.app_secret)
            .send()
            .await
            .context("Failed to send request to Privy API")?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("Privy API error ({}): {}", status, body);
        }

        let user: PrivyUser = response
            .json()
            .await
            .context("Failed to parse Privy user response")?;

        Ok(user)
    }

    /// Extract Solana wallet address from Privy user
    /// Returns the embedded wallet if present, otherwise the first external Solana wallet
    pub fn extract_solana_wallet(&self, user: &PrivyUser) -> Result<String> {
        // First, try to find embedded Solana wallet
        if let Some(wallet) = &user.wallet {
            if wallet.chain_type == "solana" && wallet.wallet_client_type == "privy" {
                return Ok(wallet.address.clone());
            }
        }

        // Otherwise, find first external Solana wallet
        for wallet in &user.wallets {
            if wallet.chain_type == "solana" {
                return Ok(wallet.address.clone());
            }
        }

        anyhow::bail!("No Solana wallet found for user")
    }

    /// Determine login type based on Privy user data
    pub fn determine_login_type(&self, user: &PrivyUser) -> Result<crate::models::user::LoginType> {
        // Check if user has email (email-based login)
        if user.email.is_some() {
            // Check if they have an embedded wallet (created by Privy)
            if let Some(wallet) = &user.wallet {
                if wallet.chain_type == "solana" && wallet.wallet_client_type == "privy" {
                    return Ok(crate::models::user::LoginType::EmailEmbedded);
                }
            }
            // If they have email but no embedded wallet, still treat as email_embedded
            // (Privy should have created one, but handle edge case)
            return Ok(crate::models::user::LoginType::EmailEmbedded);
        }

        // No email means external wallet login (Phantom)
        Ok(crate::models::user::LoginType::PhantomExternal)
    }
}
