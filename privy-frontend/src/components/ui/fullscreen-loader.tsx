"use client";

import { Box, CircularProgress } from "@mui/material";

export const FullScreenLoader = () => {
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "background.default",
        zIndex: 9999,
      }}
    >
      <CircularProgress size={72} sx={{ color: "primary.main" }} />
    </Box>
  );
};
