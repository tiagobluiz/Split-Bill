import { alpha, createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#EF5B3C"
    },
    secondary: {
      main: "#0F766E"
    },
    background: {
      default: "#FFF8F2",
      paper: "#FFFFFF"
    },
    text: {
      primary: "#1D1D1F",
      secondary: "#5C5C63"
    }
  },
  shape: {
    borderRadius: 20
  },
  typography: {
    fontFamily: "Public Sans, Segoe UI, Helvetica Neue, Arial, sans-serif",
    h1: {
      fontWeight: 800,
      fontSize: "clamp(2.4rem, 5vw, 4.4rem)",
      lineHeight: 1.05
    },
    h2: {
      fontWeight: 800,
      fontSize: "clamp(1.75rem, 3vw, 2.6rem)"
    },
    h3: {
      fontWeight: 700
    },
    button: {
      textTransform: "none",
      fontWeight: 700
    }
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          border: `1px solid ${alpha("#EF5B3C", 0.08)}`,
          boxShadow: "0 24px 60px rgba(31, 23, 15, 0.08)"
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 18,
          minHeight: 46
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 18
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999
        }
      }
    }
  }
});
