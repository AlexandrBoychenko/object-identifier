import { createTheme } from "@mui/material";
import { Shadows } from "@mui/material/styles";

export const theme = createTheme({
  shadows: [...createTheme().shadows].map(() => "none") as Shadows,
  palette: {
    action: {
      selected: "#F9F3FF",
      hover: "#F9F3FF",
    },
    primary: {
      main: "#0000ff",
      contrastText: "#fff",
    },
  },
  typography: {
    fontFamily: "ClotherRegular",
    h2: {
      fontSize: "28px",
      lineHeight: "24px",
      fontWeight: "bold",
      marginBottom: "15px",
      color: "#18181E",
      fontFamily: "ClotherBold",
    },
    body2: {
      color: "#A1A1A1",
      fontSize: "18px",
      lineHeight: "18px",
    },
    caption: {
      "&::after": {
        position: "absolute",
        left: "0",
        right: "0",
        height: "1px",
        background: "#DCDCDC",
        content: "''",
        top: "50%",
        transform: "translateY(-50%)",
      },
    },
    subtitle2: {
      fontSize: "1rem",
      margin: "0.5rem",
    },
  },
});
