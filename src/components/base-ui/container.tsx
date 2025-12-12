import { HtmlHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

interface IContainerProps extends HtmlHTMLAttributes<HTMLDivElement> {
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

const maxWidthClasses: Record<NonNullable<IContainerProps["maxWidth"]>, string> = {
  sm: "max-w-[600px]",
  md: "max-w-[900px]",
  lg: "max-w-[1200px]",
  xl: "max-w-[1440px]",
};

const Container = ({ maxWidth = "lg", className, children, ...restProps }: IContainerProps) => {
  return (
    <div className={twMerge("mx-auto", maxWidthClasses[maxWidth], className)} {...restProps}>
      {children}
    </div>
  );
};

export default Container;
