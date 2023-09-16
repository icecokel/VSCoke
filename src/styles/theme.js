const { createTheme } = require("@mui/material");
const { colors } = require("@/styles/colors");

export const theme = createTheme({
  components: {
    MuiStepper: {
      styleOverrides: {
        vertical: {
          ".MuiStepIcon-root.Mui-active": {
            color: colors.yellow[200],
            ".MuiTypography-h6": {},
          },
          ".MuiStepIcon-root": {
            color: colors.gray[500],
            ".MuiTypography-h6": {
              color: colors.gray[300],
            },
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          color: colors.yellow[200],
          fontWeight: 600,
          backgroundColor: colors.gray[500],
          ":disabled": {
            color: colors.gray[500],
            fontWeight: 400,
            backgroundColor: colors.gray[800],
          },
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 640,
      md: 900,
      lg: 1200,
      xl: 1440,
    },
  },
  typography: {
    fontFamily: ["'Spoqa Han Sans Neo'"].join(","),
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 700,
    },
  },
});
