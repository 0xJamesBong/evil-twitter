"use client";

import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Typography,
  CircularProgress,
  Slider,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { AllInclusive as MaxIcon } from "@mui/icons-material";
import { formatTokenBalance } from "../../lib/utils/formatting";

interface AmountInputWithSliderProps {
  amount: string;
  onAmountChange: (value: string) => void;
  maxAmount: number; // In human-readable units (e.g., 1.5 BLING)
  balanceLabel: string;
  balanceFormatted: string;
  balanceLoading: boolean;
  balanceAvailableText: string;
  mode: "deposit" | "withdraw";
  disabled?: boolean;
  decimals?: number;
}

export function AmountInputWithSlider({
  amount,
  onAmountChange,
  maxAmount,
  balanceLabel,
  balanceFormatted,
  balanceLoading,
  balanceAvailableText,
  mode,
  disabled = false,
  decimals = 9,
}: AmountInputWithSliderProps) {
  const [sliderValue, setSliderValue] = useState<number>(0);

  // Sync slider when amount changes externally or when maxAmount changes
  useEffect(() => {
    if (maxAmount > 0 && amount) {
      const numValue = parseFloat(amount);
      if (!isNaN(numValue) && numValue >= 0) {
        const percentage = Math.min(100, Math.max(0, (numValue / maxAmount) * 100));
        setSliderValue(percentage);
      }
    } else if (!amount || amount === "") {
      setSliderValue(0);
    }
  }, [amount, maxAmount]);

  // Reset slider when amount is cleared externally
  useEffect(() => {
    if (!amount || amount === "") {
      setSliderValue(0);
    }
  }, [amount]);

  // Handle max button click
  const handleMaxClick = () => {
    if (maxAmount > 0) {
      const maxAmountStr = maxAmount.toFixed(decimals).replace(/\.?0+$/, "");
      onAmountChange(maxAmountStr);
      setSliderValue(100);
    }
  };

  // Handle slider change
  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setSliderValue(value);
    if (maxAmount > 0) {
      const newAmount = (maxAmount * value) / 100;
      onAmountChange(newAmount.toFixed(decimals).replace(/\.?0+$/, ""));
    }
  };

  // Handle amount input change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onAmountChange(value);
    if (maxAmount > 0 && value) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        const percentage = Math.min(100, (numValue / maxAmount) * 100);
        setSliderValue(percentage);
      }
    } else {
      setSliderValue(0);
    }
  };

  return (
    <>
      {/* Balance Display */}
      <Box
        sx={{
          p: 2,
          borderRadius: 1,
          backgroundColor: "action.hover",
        }}
      >
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {balanceLabel}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {balanceLoading ? (
            <CircularProgress size={20} />
          ) : (
            balanceFormatted
          )}
        </Typography>
        {balanceAvailableText && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            {balanceAvailableText}
          </Typography>
        )}
      </Box>

      {/* Amount Input with Max Button */}
      <TextField
        label="Amount"
        type="number"
        value={amount}
        onChange={handleAmountChange}
        placeholder="Enter amount"
        fullWidth
        disabled={disabled}
        inputProps={{
          min: 0,
          step: Math.pow(10, -decimals),
          max: maxAmount,
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={handleMaxClick}
                disabled={disabled || maxAmount <= 0}
                edge="end"
                size="small"
                sx={{ mr: -1 }}
              >
                <MaxIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
        helperText={
          maxAmount > 0
            ? `Maximum: ${balanceFormatted} BLING`
            : mode === "deposit"
              ? "No wallet balance available"
              : "No vault balance available"
        }
      />

      {/* Slider */}
      {maxAmount > 0 && (
        <Box sx={{ px: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Amount: {amount || "0"} BLING ({sliderValue.toFixed(0)}%)
          </Typography>
          <Slider
            value={sliderValue}
            onChange={handleSliderChange}
            min={0}
            max={100}
            step={0.1}
            disabled={disabled}
            sx={{
              color: mode === "deposit" ? "success.main" : "error.main",
              "& .MuiSlider-thumb": {
                width: 20,
                height: 20,
              },
              "& .MuiSlider-track": {
                height: 6,
              },
              "& .MuiSlider-rail": {
                height: 6,
              },
            }}
          />
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              0%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              100%
            </Typography>
          </Box>
        </Box>
      )}
    </>
  );
}

