"use client";

import { TTextType } from "./text.types";
import { HTMLAttributes, createElement } from "react";

interface IBaseTextProps extends HTMLAttributes<HTMLSpanElement> {
  type?: TTextType;
  fontWeight?: number;
}

const textClasses: Record<TTextType, string> = {
  h1: "text-[6rem] font-light leading-[1.167]",
  h2: "text-[4.5rem] font-light leading-[1.2]",
  h3: "text-5xl font-normal leading-[1.167]",
  h4: "text-[2.125rem] font-bold leading-[1.235]",
  h5: "text-2xl font-bold leading-[1.334]",
  h6: "text-xl font-bold leading-[1.6]",
  body1: "leading-6 text-base",
  body2: "leading-6 text-sm",
  caption: "leading-6 text-xs",
};

const BaseText = ({ children, type = "body1", fontWeight, style, className, ...props }: IBaseTextProps) => {
  const textClass = textClasses[type];
  const combinedClassName = `${textClass} ${className || ""}`;

  if (!["body1", "body2", "caption"].includes(type)) {
    return createElement(
      type,
      { className: combinedClassName, style: { ...style, fontWeight: fontWeight }, ...props },
      children,
    );
  }
  return createElement("span", { className: combinedClassName, ...props }, children);
};

export default BaseText;
