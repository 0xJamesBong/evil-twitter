"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { ThemeProvider } from "next-themes";
import { MuiThemeProvider } from "@/components/mui-theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <MuiThemeProvider>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
          clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!}
          config={{
            appearance: {
              accentColor: "#00A2C7", // Teal 500
              theme: "#FFFFFF",
              showWalletLoginFirst: false,
              logo: "https://auth.privy.io/logos/privy-logo.png",
              walletChainType: "solana-only",
              walletList: [
                // "detected_ethereum_wallets",
                "detected_solana_wallets",
                "metamask",
                "phantom",
                // "coinbase_wallet",
                // "base_account",
                // "rainbow",
                // "solflare",
                // "backpack",
                // "okx_wallet",
                // "wallet_connect"
              ],
            },
            loginMethods: ["email", "wallet"],
            fundingMethodConfig: {
              moonpay: {
                useSandbox: true,
              },
            },
            embeddedWallets: {
              showWalletUIs: true,
              // ethereum: {
              //   createOnLogin: "off",
              // },
              solana: {
                createOnLogin: "users-without-wallets",
              },
            },
            mfa: {
              noPromptOnMfaRequired: false,
            },
            externalWallets: { solana: { connectors: toSolanaWalletConnectors() } },
          }}
        >
          {children}
        </PrivyProvider>
      </MuiThemeProvider>
    </ThemeProvider>
  );
}



