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
    borderRadius: 16
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
      fontWeight: 700,
      fontSize: "clamp(1.3rem, 2vw, 1.7rem)"
    },
    h4: {
      fontWeight: 700,
      fontSize: "clamp(1.15rem, 1.8vw, 1.5rem)"
    },
    subtitle1: {
      fontWeight: 600
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
          borderRadius: 18,
          border: `1px solid ${alpha("#1D1D1F", 0.08)}`,
          boxShadow: "0 18px 42px rgba(31, 23, 15, 0.06)"
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          paddingInline: 16,
          minHeight: 44,
          boxShadow: "none"
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 700
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 14
        }
      }
    }
  }
});
