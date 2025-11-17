"use client";

import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import { Box, Button, Chip } from "@mui/material";

import { FullScreenLoader } from "@/components/ui/fullscreen-loader";
import { TweetWall } from "@/components/tweets/TweetWall";

function HomeContent() {
  const { ready, authenticated, login } = usePrivy();

  if (!ready) {
    return <FullScreenLoader />;
  }

  if (!authenticated) {
    return (
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
          <Box
            component="h1"
            sx={{
              color: "white",
              fontSize: { xs: "3rem", md: "4.5rem" },
              fontWeight: 500,
              lineHeight: 1.2,
              mb: 2,
              m: 0,
            }}
          >
            EVIL TWITTER
          </Box>
          <Box
            component="p"
            sx={{
              color: "white",
              mb: 4,
              maxWidth: "md",
              fontSize: "1.25rem",
            }}
          >
            Try to create an account with privy and put it in our backend
          </Box>
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
    );
  }

  return <TweetWall />;
}

function Home() {
  return <HomeContent />;
}

export default Home;
