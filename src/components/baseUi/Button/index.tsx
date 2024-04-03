import styles from "./style.module.css";
import { TButtonType, TColor } from "./type";
import { createElement, HtmlHTMLAttributes } from "react";

interface IButton extends HtmlHTMLAttributes<HTMLButtonElement> {
  type?: TButtonType;
  color?: TColor;
  disabled?: boolean;
}

const Button = ({ type = "text", color = "primary", ...restProps }: IButton) => {
  return createElement("button", {
    ...restProps,
    className: `${styles.button} ${styles[type]} ${styles[color]} ${restProps.className}`,
  });
};

export default Button;
