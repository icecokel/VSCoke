import { TButtonType, TColor } from "./type";
import { createElement, HtmlHTMLAttributes } from "react";

interface IButton extends HtmlHTMLAttributes<HTMLButtonElement> {
  type?: TButtonType;
  color?: TColor;
  disabled?: boolean;
}

const getButtonClasses = (type: TButtonType, color: TColor) => {
  const baseClasses = "font-semibold py-2 px-4 rounded transition-colors duration-300";

  const typeClasses = {
    text: "text-white",
    outline: "text-black bg-white",
    contained: "text-white border",
  };

  const colorClasses = {
    primary: "bg-blue-300 hover:text-blue-300 hover:border-blue-300 hover:bg-blue-300/50",
    secondary: "bg-gray-300 hover:bg-gray-300/50",
  };

  const disabledClasses = "disabled:text-gray-100 disabled:bg-gray-300 disabled:border-gray-100";

  return `${baseClasses} ${typeClasses[type]} ${colorClasses[color]} ${disabledClasses}`;
};

const Button = ({ type = "text", color = "primary", ...restProps }: IButton) => {
  return createElement("button", {
    ...restProps,
    className: `${getButtonClasses(type, color)} ${restProps.className || ""}`,
  });
};

export default Button;
