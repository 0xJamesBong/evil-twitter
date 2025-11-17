"use client";

import React from "react";
import { Card, CardContent, Typography, Box, Stack, Button, Chip } from "@mui/material";

interface IAction {
  name: string;
  function: () => void;
  disabled?: boolean;
}

interface ISection {
  name: string;
  description?: string;
  filepath?: string;
  actions: IAction[];
  children?: React.ReactNode;
}

const Section = ({
  name,
  description,
  filepath,
  actions,
  children,
}: ISection) => {
  return (
    <Card sx={{ py: 2, my: 2 }}>
      <CardContent>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2, alignItems: { md: "center" }, mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {name}
          </Typography>
          {filepath && (
            <Chip
              label={`@${filepath}`}
              size="small"
              sx={{
                bgcolor: "primary.50",
                color: "primary.main",
                fontSize: "0.875rem",
                height: 24,
              }}
            />
          )}
        </Box>
        {description && (
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            {description}
          </Typography>
        )}

        {children && <Box sx={{ my: 2 }}>{children}</Box>}

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
          {actions.map((action, index) => (
            <Button
              key={index}
              onClick={action.function}
              disabled={action.disabled}
              variant="outlined"
              size="small"
            >
              {action.name}
            </Button>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default Section;
