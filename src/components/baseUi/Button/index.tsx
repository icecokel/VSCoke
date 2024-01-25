import { styles } from "./style";
import { TButtonType } from "./type";
import { createElement, HtmlHTMLAttributes } from "react";

interface IButton extends HtmlHTMLAttributes<HTMLButtonElement> {
  type?: TButtonType;
}

const Button = ({ type = "text", ...restProps }: IButton) => {
  return createElement("button", { style: styles[type], ...restProps });
};

export default Button;
