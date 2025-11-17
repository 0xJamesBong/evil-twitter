"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    // <PrivyProvider
    //   appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
    //   clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!}
    //   config={{
    //     embeddedWallets: {
    //       ethereum: {
    //         createOnLogin: "users-without-wallets",
    //       },
    //       solana: {
    //         createOnLogin: "users-without-wallets",
    //       },
    //     },
    //     appearance: { walletChainType: "ethereum-and-solana" },
    //     externalWallets: { solana: { connectors: toSolanaWalletConnectors() } },
    //   }}
    // >
    //   {children}
    // </PrivyProvider>

    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!}
      config={{
        "appearance": {
          "accentColor": "#6A6FF5",
          "theme": "#FFFFFF",
          "showWalletLoginFirst": false,
          "logo": "https://auth.privy.io/logos/privy-logo.png",
          "walletChainType": "solana-only",
          "walletList": [
            "detected_solana_wallets",
            "phantom",
          ]
        },
        "loginMethods": [
          "email",
          "wallet"
        ],
        "fundingMethodConfig": {
          "moonpay": {
            "useSandbox": true
          }
        },
        "embeddedWallets": {
          "showWalletUIs": true,
          "ethereum": {
            "createOnLogin": "off"
          },
          "solana": {
            "createOnLogin": "users-without-wallets"
          }
        },
        "mfa": {
          "noPromptOnMfaRequired": false
        },
        externalWallets: { solana: { connectors: toSolanaWalletConnectors() } },

      }}
    >
      {children}
    </PrivyProvider>
  );
}
