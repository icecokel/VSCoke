import { Grid } from "@mui/material";
import Box from "@mui/material/Box";
import { ReactNode } from "react";

interface ILayoutProps {
  children: ReactNode;
}

const LayoutContext = ({ children }: ILayoutProps) => {
  return (
    <Grid container>
      <Grid item sm={1}>
        <Box className="gray-900">layout</Box>
      </Grid>
      <Grid item sm={11}>
        {children}
      </Grid>
    </Grid>
  );
};

export default LayoutContext;
