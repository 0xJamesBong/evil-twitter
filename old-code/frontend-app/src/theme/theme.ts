import { createTheme, ThemeOptions } from "@mui/material/styles";
import { tealPalette, greyPalette } from "./palette";

declare module "@mui/material/styles" {
  interface Palette {
    teal: typeof tealPalette;
  }
  interface PaletteOptions {
    teal?: typeof tealPalette;
  }
}

const createCustomTheme = (mode: "light" | "dark"): ThemeOptions => ({
  palette: {
    mode,
    primary: {
      main: tealPalette[500],
      light: tealPalette[300],
      dark: tealPalette[700],
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: tealPalette[400],
      light: tealPalette[200],
      dark: tealPalette[600],
      contrastText: "#FFFFFF",
    },
    background: {
      default: mode === "light" ? greyPalette[50] : greyPalette[900],
      paper: mode === "light" ? greyPalette[50] : greyPalette[800],
    },
    text: {
      primary: mode === "light" ? greyPalette[900] : greyPalette[50],
      secondary: mode === "light" ? greyPalette[600] : greyPalette[400],
    },
    grey: {
      50: greyPalette[50],
      100: greyPalette[100],
      200: greyPalette[200],
      300: greyPalette[300],
      400: greyPalette[400],
      500: greyPalette[500],
      600: greyPalette[600],
      700: greyPalette[700],
      800: greyPalette[800],
      900: greyPalette[900],
    },
    error: {
      main: "#ef4444",
      light: "#f87171",
      dark: "#dc2626",
    },
    warning: {
      main: "#f59e0b",
      light: "#fbbf24",
      dark: "#d97706",
    },
    info: {
      main: tealPalette[500],
      light: tealPalette[300],
      dark: tealPalette[700],
    },
    success: {
      main: "#10b981",
      light: "#34d399",
      dark: "#059669",
    },
    teal: tealPalette,
  },
  typography: {
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: "none",
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
          fontWeight: 500,
          padding: "8px 16px",
        },
        contained: {
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          "&:hover": {
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow:
            "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          marginTop: 4,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
  },
});

export const createAppTheme = (mode: "light" | "dark") =>
  createTheme(createCustomTheme(mode));
