import { breakPoints } from "@/styles/breakPoints";
import { HtmlHTMLAttributes, createElement } from "react";

interface IContainer extends HtmlHTMLAttributes<HTMLDivElement> {
  maxWidth?: "sm";
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
