import { breakPoints } from "@/styles/break-points";
import { HtmlHTMLAttributes, createElement } from "react";

interface IContainer extends HtmlHTMLAttributes<HTMLDivElement> {
  maxWidth?: "sm" | "md";
}

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
