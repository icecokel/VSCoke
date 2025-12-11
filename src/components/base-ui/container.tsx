import { HtmlHTMLAttributes, createElement } from "react";

interface IContainer extends HtmlHTMLAttributes<HTMLDivElement> {
  maxWidth?: "sm" | "md";
}

const breakPoints = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1440,
};

const Container = ({ maxWidth, ...restProps }: IContainer) => {
  return createElement("div", {
    ...restProps,
    style: {
      marginLeft: "auto",
      marginRight: "auto",
      maxWidth: breakPoints[maxWidth ?? "lg"],
    },
  });
};

export default Container;
