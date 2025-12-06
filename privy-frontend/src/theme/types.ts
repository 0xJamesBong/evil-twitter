declare module "@mui/material/styles" {
  interface Palette {
    accent: {
      green: string;
      red: string;
      blue: string;
      yellow: string;
      purple: string;
      teal: string;
    };
    bg: {
      base: string;
      surface1: string;
      surface2: string;
      elevated: string;
    };
  }

  interface PaletteOptions {
    accent?: {
      green: string;
      red: string;
      blue: string;
      yellow: string;
      purple: string;
      teal: string;
    };
    bg?: {
      base: string;
      surface1: string;
      surface2: string;
      elevated: string;
    };
  }
}

declare module "@mui/material/Button" {
  interface ButtonPropsVariantOverrides {
    pump: true;
    smack: true;
  }
}

