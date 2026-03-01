import { createTheme } from "@mui/material";

export const appTheme = createTheme({
  palette: {
    primary: {
      main: "#FF6B4A"
    },
    secondary: {
      main: "#2BB8A5"
    },
    background: {
      default: "#FFF9F4",
      paper: "#FFFFFF"
    },
    text: {
      primary: "#1F2937",
      secondary: "#475467"
    }
  },
  shape: {
    borderRadius: 12
  },
  typography: {
    fontFamily: "Public Sans, Segoe UI, Helvetica Neue, Arial, sans-serif"
  }
});
