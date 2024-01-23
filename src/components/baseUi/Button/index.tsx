import { styles } from "./style";
import { TButtonType } from "./type";
import { createElement, HtmlHTMLAttributes } from "react";

interface IButton extends HtmlHTMLAttributes<HTMLButtonElement> {
  type?: TButtonType;
}

const Button = ({ type = "text", ...restProps }: IButton) => {
  return createElement("button", { ...restProps, style: styles[type] });
};

export default Button;
