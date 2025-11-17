"use client";

import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import {
  Box,
  Container,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  Chip,
} from "@mui/material";
import { ArrowBack as ArrowLeftIcon } from "@mui/icons-material";
import { useSnackbar } from "notistack";

import { FullScreenLoader } from "@/components/ui/fullscreen-loader";
import { Header } from "@/components/ui/header";
import CreateAWallet from "@/components/sections/create-a-wallet";
import UserObject from "@/components/sections/user-object";
import FundWallet from "@/components/sections/fund-wallet";
import LinkAccounts from "@/components/sections/link-accounts";
import UnlinkAccounts from "@/components/sections/unlink-accounts";
import WalletActions from "@/components/sections/wallet-actions";
import SessionSigners from "@/components/sections/session-signers";
import WalletManagement from "@/components/sections/wallet-management";
import MFA from "@/components/sections/mfa";
import { SyncPrivy } from "@/components/auth/SyncPrivy";

import { useBackendUserStore } from "@/lib/stores/backendUserStore";
import { usePingStore } from "@/lib/stores/pingStore";
import { API_BASE_URL } from "../lib/config";

function HomeContent() {
  const { ready, authenticated, logout, login, user: privyUser } = usePrivy();
  const { user: backendUser, isLoading, error } = useBackendUserStore();
  const { ping, response, isLoading: isPinging, error: pingError } = usePingStore();
  const { enqueueSnackbar } = useSnackbar();

  console.log("Home, backendUser:", backendUser);
  console.log("Home, privyUser:", privyUser);
  console.log("API_BASE_URL: ", API_BASE_URL);

  if (!ready) {
    return <FullScreenLoader />;
  }

  return (
    <Box
      sx={{
        backgroundColor: "grey.50",
        minHeight: "100vh",
        maxHeight: { md: "100vh" },
        overflow: { md: "hidden" },
      }}
    >
      <Header />
      {authenticated ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            height: { md: "calc(100vh - 60px)" },
          }}
        >
          <Box
            sx={{
              flexGrow: 1,
              overflowY: "auto",
              p: 2,
              pl: { md: 4 },
            }}
          >
            <Button
              startIcon={<ArrowLeftIcon />}
              onClick={logout}
              sx={{ mb: 2 }}
            >
              Logout
            </Button>

            <Stack spacing={2}>
              {/* Backend Connection Test */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Backend Connection Test
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={ping}
                    disabled={isPinging}
                    sx={{ mb: 2 }}
                  >
                    {isPinging ? (
                      <>
                        <CircularProgress size={16} sx={{ mr: 1 }} />
                        Pinging...
                      </>
                    ) : (
                      "Ping Backend"
                    )}
                  </Button>
                  {response && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      <strong>Response:</strong> {response}
                    </Alert>
                  )}
                  {pingError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      <strong>Error:</strong> {pingError}
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* User Data Display */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    User Data
                  </Typography>

                  {/* Privy User Data */}
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ mb: 1, color: "primary.main", fontWeight: 600 }}
                    >
                      Privy User Data
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: "grey.50",
                        maxHeight: 384,
                        overflow: "auto",
                      }}
                    >
                      <Typography
                        component="pre"
                        sx={{
                          fontSize: "0.75rem",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          fontFamily: "monospace",
                          m: 0,
                        }}
                      >
                        {privyUser
                          ? JSON.stringify(privyUser, null, 2)
                          : "No Privy user data (not authenticated)"}
                      </Typography>
                    </Paper>
                  </Box>

                  {/* Backend User Data */}
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{ mb: 1, color: "success.main", fontWeight: 600 }}
                    >
                      Backend User Data
                    </Typography>
                    {isLoading && (
                      <Box sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2" color="text.secondary">
                          Loading backend user...
                        </Typography>
                      </Box>
                    )}
                    {error && (
                      <Alert severity="error" sx={{ mb: 1 }}>
                        Error: {error}
                      </Alert>
                    )}
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: "grey.50",
                        maxHeight: 384,
                        overflow: "auto",
                      }}
                    >
                      <Typography
                        component="pre"
                        sx={{
                          fontSize: "0.75rem",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          fontFamily: "monospace",
                          m: 0,
                        }}
                      >
                        {backendUser
                          ? JSON.stringify(backendUser, null, 2)
                          : "No backend user data (not onboarded)"}
                      </Typography>
                    </Paper>
                  </Box>
                </CardContent>
              </Card>

              {/* Section Components */}
              <CreateAWallet />
              <FundWallet />
              <LinkAccounts />
              <UnlinkAccounts />
              <WalletActions />
              <SessionSigners />
              <WalletManagement />
              <MFA />
            </Stack>
          </Box>
          <UserObject />
        </Box>
      ) : (
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: "calc(100vh - 60px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            src="./BG.svg"
            alt="Background"
            fill
            style={{ objectFit: "cover", zIndex: 0 }}
            priority
          />
          <Box
            sx={{
              position: "relative",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              textAlign: "center",
            }}
          >
            <Chip
              label="Next.js Demo"
              sx={{
                height: 40,
                px: 3,
                borderColor: "white",
                color: "white",
                borderWidth: 1,
                borderStyle: "solid",
                backgroundColor: "transparent",
                fontSize: "1.125rem",
                mb: 2,
              }}
            />
            <Typography
              variant="h1"
              sx={{
                color: "white",
                fontSize: { xs: "3rem", md: "4.5rem" },
                fontWeight: 500,
                lineHeight: 1.2,
                mb: 2,
              }}
            >
              EVIL TWITTER
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: "white",
                mb: 4,
                maxWidth: "md",
              }}
            >
              Try to create an account with privy and put it in our backend
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => {
                login();
                setTimeout(() => {
                  (
                    document.querySelector(
                      'input[type="email"]'
                    ) as HTMLInputElement
                  )?.focus();
                }, 150);
              }}
              sx={{
                borderRadius: "9999px",
                px: { xs: 4, lg: 8 },
                py: { xs: 2, lg: 4 },
                fontSize: { xs: "1rem", lg: "1.25rem" },
                maxWidth: "md",
                width: "100%",
                bgcolor: "white",
                color: "grey.900",
                "&:hover": {
                  bgcolor: "grey.100",
                },
              }}
            >
              login
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

function Home() {
  return <HomeContent />;
}

export default Home;
