"use client";

import { SyncPrivy } from "@/components/auth/SyncPrivy";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { SnackbarProvider } from "notistack";
import { theme } from "@/theme/theme";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        autoHideDuration={5000}
      >
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
          {...(process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID && {
            clientId: process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID,
          })}
          config={{
            appearance: {
              accentColor: "#00A2C7", // Teal 500
              theme: "#FFFFFF",
              showWalletLoginFirst: false,
              logo: "https://auth.privy.io/logos/privy-logo.png",
              walletChainType: "ethereum-and-solana",
            },
            loginMethods: ["email", "wallet"],
            fundingMethodConfig: {
              moonpay: {
                useSandbox: true,
              },
            },
            embeddedWallets: {
              showWalletUIs: true,
              ethereum: {
                createOnLogin: "users-without-wallets",
              },
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
          <SyncPrivy />
          {children}
        </PrivyProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}
