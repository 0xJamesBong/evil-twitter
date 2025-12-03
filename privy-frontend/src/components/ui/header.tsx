"use client";

import { Box, AppBar, Toolbar, Typography } from "@mui/material";
import { VaultNavbar } from "@/components/solana/VaultNavbar";

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
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "text.primary",
            }}
          >
            SPEAQER
          </Typography>
        </Box>

        <VaultNavbar />
      </Toolbar>
    </AppBar>
  );
}
