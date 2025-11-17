import { createTheme } from "@mui/material/styles";

// Custom Teal color palette
const teal = {
  900: "#002E3D",
  800: "#004054",
  700: "#00566B",
  600: "#007994",
  500: "#00A2C7", // Primary logo color
  400: "#3EC7E3", // Primary logo color
  300: "#7CE8FE", // Primary logo color
  200: "#B3F2FF",
  100: "#D6F8FF",
  50: "#EBFBFF",
};

// Custom Grey color palette
const grey = {
  900: "#14121E",
  800: "#262334",
  700: "#444054",
  600: "#615F6D",
  500: "#7B7986",
  400: "#A8A7AE",
  300: "#D7D6DB",
  200: "#EFEFF0",
  100: "#F7F7F8",
  50: "#FFFFFF",
};

// Create MUI theme
export const theme = createTheme({
  palette: {
    primary: {
      main: teal[500], // #00A2C7
      light: teal[300], // #7CE8FE
      dark: teal[700], // #00566B
      contrastText: grey[50], // #FFFFFF
      50: teal[50],
      100: teal[100],
      200: teal[200],
      300: teal[300],
      400: teal[400],
      500: teal[500],
      600: teal[600],
      700: teal[700],
      800: teal[800],
      900: teal[900],
    },
    secondary: {
      main: teal[400], // #3EC7E3
      light: teal[200], // #B3F2FF
      dark: teal[600], // #007994
      contrastText: grey[900], // #14121E
    },
    background: {
      default: grey[50], // #FFFFFF
      paper: grey[50], // #FFFFFF
    },
    text: {
      primary: grey[900], // #14121E
      secondary: grey[700], // #444054
      disabled: grey[400], // #A8A7AE
    },
    grey: {
      50: grey[50],
      100: grey[100],
      200: grey[200],
      300: grey[300],
      400: grey[400],
      500: grey[500],
      600: grey[600],
      700: grey[700],
      800: grey[800],
      900: grey[900],
    },
    error: {
      main: "#D32F2F",
      light: "#EF5350",
      dark: "#C62828",
    },
    warning: {
      main: "#ED6C02",
      light: "#FF9800",
      dark: "#E65100",
    },
    info: {
      main: teal[500],
      light: teal[300],
      dark: teal[700],
    },
    success: {
      main: "#2E7D32",
      light: "#4CAF50",
      dark: "#1B5E20",
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
      textTransform: "none", // Disable uppercase transformation
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
          borderRadius: 8,
          padding: "8px 16px",
          fontWeight: 500,
        },
        contained: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

// Export color constants for direct use if needed
export { teal, grey };
