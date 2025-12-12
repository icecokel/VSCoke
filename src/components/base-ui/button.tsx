import { TButtonVariant, TButtonColor } from "./button.types";
import { ButtonHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

interface IButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TButtonVariant;
  color?: TButtonColor;
}

const variantClasses: Record<TButtonVariant, string> = {
  text: "text-white bg-transparent",
  outline: "text-black bg-white border border-gray-300",
  contained: "text-white border",
};

const colorClasses: Record<TButtonColor, string> = {
  primary: "bg-blue-300 hover:text-blue-300 hover:border-blue-300 hover:bg-blue-300/50",
  secondary: "bg-gray-300 hover:bg-gray-300/50",
};

const Button = ({
  variant = "text",
  color = "primary",
  className,
  children,
  ...restProps
}: IButtonProps) => {
  return (
    <button
      className={twMerge(
        "cursor-pointer font-semibold py-2 px-4 rounded-sm transition-colors duration-300",
        variantClasses[variant],
        colorClasses[color],
        "disabled:cursor-default disabled:text-gray-100 disabled:bg-gray-300 disabled:border-gray-100",
        className,
      )}
      {...restProps}
    >
      {children}
    </button>
  );
};

export default Button;
