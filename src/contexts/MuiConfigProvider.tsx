"use client";

import { IHaveChildren } from "@/models/common";
import { theme } from "@/styles/theme";
import { ThemeProvider } from "@mui/material";

const MuiConfigProvider = ({ children }: IHaveChildren) => {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

export default MuiConfigProvider;
