"use client";

import { Box, AppBar, Toolbar, Typography, Button, Chip, Link } from "@mui/material";
import { OpenInNew as ArrowUpRightIcon, ArrowForward as ArrowRightIcon } from "@mui/icons-material";
import { PrivyLogo } from "./privy-logo";

export function Header() {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: "background.paper",
        borderBottom: 1,
        borderColor: "grey.200",
        height: 60,
      }}
    >
      <Toolbar
        sx={{
          justifyContent: "space-between",
          px: 3,
          minHeight: "60px !important",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PrivyLogo className="w-[103.48px] h-[23.24px]" />
          <Chip
            label="Next.js Demo"
            size="small"
            sx={{
              height: 22,
              fontSize: "0.75rem",
              borderColor: "primary.main",
              color: "primary.main",
              borderWidth: 1,
              borderStyle: "solid",
              backgroundColor: "transparent",
            }}
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Link
            href="https://docs.privy.io/basics/react/installation"
            target="_blank"
            rel="noreferrer"
            sx={{
              color: "primary.main",
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              textDecoration: "none",
              "&:hover": {
                textDecoration: "underline",
              },
            }}
          >
            Docs <ArrowUpRightIcon sx={{ fontSize: 16 }} />
          </Link>

          <Button
            variant="contained"
            sx={{
              borderRadius: "9999px",
              display: { xs: "none", md: "flex" },
            }}
          >
            <Link
              href="https://dashboard.privy.io/"
              target="_blank"
              rel="noreferrer"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                color: "inherit",
                textDecoration: "none",
              }}
            >
              <span>Go to dashboard</span>
              <ArrowRightIcon sx={{ fontSize: 16 }} />
            </Link>
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
