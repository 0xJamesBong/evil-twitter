import { createTheme } from "@mui/material/styles";
// Import type declarations - must be imported before createTheme
import "./types";

// Create Evil Twitter Neon Dark Theme
export const theme = createTheme({
  palette: {
    mode: "dark",

    // Custom background surfaces
    bg: {
      base: "#0B0E11",
      surface1: "#111418",
      surface2: "#181C20",
      elevated: "#1F242A",
    },

    // Custom neon accent colors
    accent: {
      green: "#2BE38B",
      red: "#FF476C",
      blue: "#3FA9F5",
      yellow: "#FFC847",
      purple: "#8A4FFF",
      teal: "#28E7D5",
    },

    // Map standard MUI colors to neon palette
    primary: {
      main: "#3FA9F5",
      light: "#6BC4FF",
      dark: "#2B7AB3",
      contrastText: "#000000",
    },
    success: {
      main: "#2BE38B",
      light: "#5FE9A8",
      dark: "#1FA06A",
      contrastText: "#000000",
    },
    error: {
      main: "#FF476C",
      light: "#FF6B8A",
      dark: "#CC2F4F",
      contrastText: "#000000",
    },
    warning: {
      main: "#FFC847",
      light: "#FFD66B",
      dark: "#CC9F38",
      contrastText: "#000000",
    },
    secondary: {
      main: "#8A4FFF",
      light: "#A872FF",
      dark: "#6D3FCC",
      contrastText: "#FFFFFF",
    },
    info: {
      main: "#28E7D5",
      light: "#4FEDDF",
      dark: "#1FB8AA",
      contrastText: "#000000",
    },

    // Text colors for dark mode
    text: {
      primary: "#FFFFFF",
      secondary: "#9BA3AF",
      disabled: "#6A717D",
    },

    // Background colors
    background: {
      default: "#0B0E11",
      paper: "#111418",
    },

    // Grey scale for dark mode
    grey: {
      50: "#FFFFFF",
      100: "#F7F7F8",
      200: "#EFEFF0",
      300: "#D7D6DB",
      400: "#A8A7AE",
      500: "#7B7986",
      600: "#615F6D",
      700: "#444054",
      800: "#262334",
      900: "#14121E",
    },
  },

  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    fontWeightRegular: 500,
    fontWeightMedium: 600,
    fontWeightBold: 700,
    h1: {
      fontWeight: 700,
      fontSize: "2.5rem",
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 700,
      fontSize: "2rem",
      lineHeight: 1.3,
    },
    h3: {
      fontWeight: 600,
      fontSize: "1.75rem",
      lineHeight: 1.4,
    },
    h4: {
      fontWeight: 600,
      fontSize: "1.5rem",
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: "1.25rem",
      lineHeight: 1.5,
    },
    h6: {
      fontWeight: 600,
      fontSize: "1rem",
      lineHeight: 1.5,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.5,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },

  shape: {
    borderRadius: 8,
  },

  components: {
    // Button overrides with custom variants
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 6,
          transition: "all 150ms ease",
          "&:hover": {
            filter: "brightness(1.12)",
          },
        },
      },
      variants: [
        {
          props: { variant: "pump" },
          style: {
            backgroundColor: "#2BE38B",
            color: "#000",
            "&:hover": {
              backgroundColor: "#2BE38B",
              boxShadow: "0 0 8px rgba(43,227,139,0.5)",
            },
          },
        },
        {
          props: { variant: "smack" },
          style: {
            backgroundColor: "#FF476C",
            color: "#000",
            "&:hover": {
              backgroundColor: "#FF476C",
              boxShadow: "0 0 8px rgba(255,71,108,0.5)",
            },
          },
        },
      ],
    },

    // Card styling (NFT/Tweet/Post surfaces)
    MuiCard: {
      styleOverrides: {
        root: {
          background: "#111418",
          border: "1px solid rgba(255,255,255,0.06)",
          transition: "all 150ms ease",
          "&:hover": {
            borderColor: "rgba(255,255,255,0.12)",
            boxShadow: "0 0 10px rgba(0,0,0,0.4)",
          },
        },
      },
    },

    // Paper surfaces (menus, dropdowns, drawers)
    MuiPaper: {
      styleOverrides: {
        root: {
          background: "#181C20",
          border: "1px solid rgba(255,255,255,0.06)",
        },
      },
    },

    // TextField/Input styling (trading terminal style)
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: "#181C20",
          borderRadius: 6,
          "& fieldset": {
            borderColor: "rgba(255,255,255,0.10)",
          },
          "&:hover fieldset": {
            borderColor: "rgba(255,255,255,0.16)",
          },
          "&.Mui-focused fieldset": {
            borderColor: "#3FA9F5",
            boxShadow: "0 0 6px rgba(63,169,245,0.4)",
          },
        },
      },
    },

    // Table styling (FTX-style orderbooks)
    MuiTableRow: {
      styleOverrides: {
        root: {
          background: "#111418",
          "&:nth-of-type(odd)": {
            background: "#181C20",
          },
          "&:hover": {
            backgroundColor: "#1F242A",
          },
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          fontFamily: "Inter, sans-serif",
          fontFeatureSettings: '"tnum" 1',
        },
      },
    },

    // Chip styling (rarity badges, voting badges)
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 6,
        },
      },
      variants: [
        {
          props: { color: "success" },
          style: {
            backgroundColor: "#2BE38B22",
            color: "#2BE38B",
            border: "1px solid #2BE38B55",
          },
        },
        {
          props: { color: "error" },
          style: {
            backgroundColor: "#FF476C22",
            color: "#FF476C",
            border: "1px solid #FF476C55",
          },
        },
      ],
    },

    // IconButton styling
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: "all 150ms ease",
          "&:hover": {
            filter: "brightness(1.2)",
          },
        },
      },
    },

    // CssBaseline for global dark mode defaults
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#0B0E11",
        },
      },
    },
  },
});
