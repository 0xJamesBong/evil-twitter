"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Box, Paper, Typography } from "@mui/material";
import "@/theme/types"; // Import type declarations

const UserObject = () => {
  const { user } = usePrivy();
  return (
    <Box
      sx={{
        width: { xs: "100%", md: "400px" },
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        borderLeft: 1,
        borderColor: "rgba(255,255,255,0.06)",
        p: 2,
        height: { md: "calc(100vh - 60px)" },
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        User object
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          bgcolor: (theme) => theme.palette.bg.surface2,
          overflowY: "auto",
          borderRadius: 1,
          flex: 1,
          borderColor: "rgba(255,255,255,0.06)",
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
            color: "text.primary",
            fontWeight: 300,
          }}
        >
          {JSON.stringify(user, null, 2)}
        </Typography>
      </Paper>
    </Box>
  );
};

export default UserObject;
