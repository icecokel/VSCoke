import styles from "./style.module.css";
import { TButtonType } from "./type";
import { createElement, HtmlHTMLAttributes } from "react";

interface IButton extends HtmlHTMLAttributes<HTMLButtonElement> {
  type?: TButtonType;
  disabled?: boolean;
}

const Button = ({ type = "text", ...restProps }: IButton) => {
  return createElement("button", {
    ...restProps,
    className: `${styles[type]} ${restProps.className}`,
  });
};

export default Button;
