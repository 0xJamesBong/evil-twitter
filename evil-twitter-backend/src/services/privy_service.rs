use base64::{Engine as _, engine::general_purpose};

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

#[derive(Debug, Deserialize, Clone)]
pub struct PrivyEmail {
    pub address: String,
}

#[derive(Debug, Deserialize, Clone)]
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

    /// Extract user ID (DID) from identity token JWT
    /// Works for both access tokens and identity tokens (both have "sub" claim)
    pub async fn extract_user_id_from_token(&self, token: &str) -> Result<String> {
        // Privy tokens (access or identity) are JWTs
        // The user ID (DID) is in the "sub" claim of the payload
        let parts: Vec<&str> = token.split('.').collect();
        if parts.len() != 3 {
            anyhow::bail!("Invalid JWT format: expected 3 parts separated by dots");
        }

        // Decode the payload (second part) - base64url encoded
        let payload = parts[1];
        let decoded = general_purpose::URL_SAFE_NO_PAD
            .decode(payload)
            .context("Failed to decode JWT payload (base64url)")?;

        let json: serde_json::Value =
            serde_json::from_slice(&decoded).context("Failed to parse JWT payload as JSON")?;

        // Extract the user ID from the "sub" claim
        let user_id = json["sub"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Missing 'sub' claim in token (user ID)"))?;

        // Verify expiration
        if let Some(exp) = json["exp"].as_i64() {
            let now = chrono::Utc::now().timestamp();
            if exp < now {
                anyhow::bail!("Token has expired");
            }
        }

        // Verify issuer (should be "privy.io")
        if let Some(iss) = json["iss"].as_str() {
            if iss != "privy.io" {
                anyhow::bail!("Invalid token issuer: expected 'privy.io', got '{}'", iss);
            }
        }

        // Verify audience (should match our app ID)
        if let Some(aud) = json["aud"].as_str() {
            if aud != self.app_id {
                anyhow::bail!("Token audience does not match app ID");
            }
        }

        Ok(user_id.to_string())
    }

    /// Parse user data from identity token JWT
    /// Identity tokens contain linked_accounts with email, wallets, etc.
    pub fn parse_user_from_identity_token(&self, id_token: &str) -> Result<PrivyUser> {
        // Decode JWT payload
        let parts: Vec<&str> = id_token.split('.').collect();
        if parts.len() != 3 {
            anyhow::bail!("Invalid JWT format: expected 3 parts separated by dots");
        }

        let payload = parts[1];
        let decoded = general_purpose::URL_SAFE_NO_PAD
            .decode(payload)
            .context("Failed to decode JWT payload (base64url)")?;

        let json: serde_json::Value =
            serde_json::from_slice(&decoded).context("Failed to parse JWT payload as JSON")?;

        // Extract user ID (DID) from "sub" claim
        let user_id = json["sub"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Missing 'sub' claim in identity token"))?
            .to_string();

        // Extract linked_accounts (stringified JSON array)
        let linked_accounts_str = json["linked_accounts"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Missing 'linked_accounts' claim in identity token"))?;

        let linked_accounts: Vec<serde_json::Value> = serde_json::from_str(linked_accounts_str)
            .context("Failed to parse linked_accounts as JSON array")?;

        eprintln!("PrivyService: Parsing identity token");
        eprintln!("  User ID: {}", user_id);
        eprintln!("  Linked accounts count: {}", linked_accounts.len());

        // Parse linked accounts to extract email and wallets
        let mut email: Option<PrivyEmail> = None;
        let mut wallet: Option<PrivyWallet> = None;
        let mut wallets: Vec<PrivyWallet> = Vec::new();

        for account in linked_accounts {
            let account_type = account["type"]
                .as_str()
                .ok_or_else(|| anyhow::anyhow!("Missing 'type' in linked account"))?;

            match account_type {
                "email" => {
                    if let Some(address) = account["address"].as_str() {
                        email = Some(PrivyEmail {
                            address: address.to_string(),
                        });
                        eprintln!("  Found email: {}", address);
                    }
                }
                "wallet" => {
                    if let Some(address) = account["address"].as_str() {
                        // Try both camelCase and snake_case field names
                        let wallet_client_type = account["walletClientType"]
                            .as_str()
                            .or_else(|| account["wallet_client_type"].as_str())
                            .unwrap_or("unknown")
                            .to_string();
                        let chain_type = account["chainType"]
                            .as_str()
                            .or_else(|| account["chain_type"].as_str())
                            .unwrap_or("unknown")
                            .to_string();

                        let privy_wallet = PrivyWallet {
                            address: address.to_string(),
                            wallet_client_type: wallet_client_type.clone(),
                            chain_type: chain_type.clone(),
                        };

                        // If it's an embedded Solana wallet, set as primary wallet
                        if chain_type == "solana" && wallet_client_type == "privy" {
                            wallet = Some(privy_wallet.clone());
                            eprintln!("  Found embedded Solana wallet: {}", address);
                        }

                        wallets.push(privy_wallet);
                    }
                }
                _ => {
                    // Ignore other account types (Farcaster, etc.)
                }
            }
        }

        Ok(PrivyUser {
            id: user_id,
            email,
            wallet,
            wallets,
        })
    }
    /// Get full user object from Privy by user ID (DID)
    pub async fn get_user_by_id(&self, user_id: &str) -> Result<PrivyUser> {
        let url = format!("{}/users/{}", self.api_url, user_id);

        eprintln!("PrivyService: Fetching user from Privy API");
        eprintln!("  URL: {}", url);
        eprintln!(
            "  App ID: {}...{}",
            &self.app_id[..self.app_id.len().min(8)],
            &self.app_id[self.app_id.len().saturating_sub(4)..]
        );
        eprintln!(
            "  App Secret: {}...{} (length: {})",
            &self.app_secret[..self.app_secret.len().min(8)],
            &self.app_secret[self.app_secret.len().saturating_sub(4)..],
            self.app_secret.len()
        );

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
            eprintln!("PrivyService: API request failed");
            eprintln!("  Status: {}", status);
            eprintln!("  Response: {}", body);
            eprintln!("  Check that PRIVY_APP_ID and PRIVY_APP_SECRET match your Privy dashboard");
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
