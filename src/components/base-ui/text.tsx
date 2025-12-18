"use client";

import { TTextType } from "./text.types";
import { HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

interface IBaseTextProps extends HTMLAttributes<HTMLElement> {
  type?: TTextType;
}

const textClasses: Record<TTextType, string> = {
  h1: "text-[5rem] font-light leading-[1.167]",
  h2: "text-[3.5rem] font-light leading-[1.2]",
  h3: "text-[2.5rem] font-normal leading-[1.167]",
  h4: "text-[1.75rem] font-bold leading-[1.235]",
  h5: "text-2xl font-bold leading-[1.334]",
  h6: "text-xl font-bold leading-[1.6]",
  body1: "leading-6 text-base",
  body2: "leading-6 text-sm",
  caption: "leading-6 text-xs",
};

const BaseText = ({ children, type = "body1", className, ...props }: IBaseTextProps) => {
  const combinedClassName = twMerge(textClasses[type], className);

  switch (type) {
    case "h1":
      return (
        <h1 className={combinedClassName} {...props}>
          {children}
        </h1>
      );
    case "h2":
      return (
        <h2 className={combinedClassName} {...props}>
          {children}
        </h2>
      );
    case "h3":
      return (
        <h3 className={combinedClassName} {...props}>
          {children}
        </h3>
      );
    case "h4":
      return (
        <h4 className={combinedClassName} {...props}>
          {children}
        </h4>
      );
    case "h5":
      return (
        <h5 className={combinedClassName} {...props}>
          {children}
        </h5>
      );
    case "h6":
      return (
        <h6 className={combinedClassName} {...props}>
          {children}
        </h6>
      );
    default:
      return (
        <span className={combinedClassName} {...props}>
          {children}
        </span>
      );
  }
};

export default BaseText;
