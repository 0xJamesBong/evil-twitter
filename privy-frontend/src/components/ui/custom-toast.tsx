"use client";

import { useSnackbar } from "notistack";

type ToastVariant = "success" | "error";

export const showSuccessToast = (message: string) => {
  // This will be called from components that have access to useSnackbar
  // For components without access, we'll need to pass enqueueSnackbar
  console.warn("showSuccessToast called without SnackbarProvider context. Use useSnackbar hook instead.");
};

export const showErrorToast = (message: string) => {
  console.warn("showErrorToast called without SnackbarProvider context. Use useSnackbar hook instead.");
};

// Hook-based toast functions
export const useToast = () => {
  const { enqueueSnackbar } = useSnackbar();

  return {
    showSuccess: (message: string) => {
      enqueueSnackbar(message, { variant: "success" });
    },
    showError: (message: string) => {
      enqueueSnackbar(message, { variant: "error" });
    },
  };
};

// Backwards compatible default
export const showCustomToast = (message: string) => showSuccessToast(message);
