"use client";

import { useNetworkStore, Network } from "@/lib/stores/networkStore";
import {
  Select,
  MenuItem,
  Chip,
  Box,
  Tooltip,
  SelectChangeEvent,
} from "@mui/material";
import {
  Cloud as CloudIcon,
  Computer as ComputerIcon,
} from "@mui/icons-material";

interface NetworkOption {
  value: Network;
  label: string;
  icon: React.ReactNode;
  color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";
  description: string;
}

const networkOptions: NetworkOption[] = [
  {
    value: "localnet",
    label: "Localnet",
    icon: <ComputerIcon sx={{ fontSize: 16 }} />,
    color: "default",
    description: "Local development network",
  },
  {
    value: "devnet",
    label: "Devnet",
    icon: <CloudIcon sx={{ fontSize: 16 }} />,
    color: "info",
    description: "Solana devnet test network",
  },
];

export function NetworkSwitcher() {
  const { network, setNetwork } = useNetworkStore();
  const currentNetwork = networkOptions.find((opt) => opt.value === network);

  const handleChange = (event: SelectChangeEvent<Network>) => {
    setNetwork(event.target.value as Network);
  };

  return (
    <Tooltip
      title={currentNetwork?.description || "Select Solana network"}
      arrow
      placement="bottom"
    >
      <Select
        value={network}
        onChange={handleChange}
        size="small"
        sx={{
          minWidth: 130,
          height: 36,
          "& .MuiSelect-select": {
            display: "flex",
            alignItems: "center",
            gap: 1,
            py: 1,
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "divider",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "primary.main",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "primary.main",
            borderWidth: 1.5,
          },
        }}
        renderValue={(value) => {
          const option = networkOptions.find((opt) => opt.value === value);
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {option?.icon}
              <Chip
                label={option?.label || value}
                size="small"
                color={option?.color || "default"}
                sx={{
                  height: 20,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  "& .MuiChip-label": {
                    px: 1,
                  },
                }}
              />
            </Box>
          );
        }}
      >
        {networkOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                width: "100%",
              }}
            >
              {option.icon}
              <Chip
                label={option.label}
                size="small"
                color={option.color}
                sx={{
                  height: 20,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  "& .MuiChip-label": {
                    px: 1,
                  },
                }}
              />
              <Box sx={{ flexGrow: 1 }} />
              <Box
                sx={{
                  fontSize: "0.7rem",
                  color: "text.secondary",
                  fontStyle: "italic",
                }}
              >
                {option.description}
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </Tooltip>
  );
}
