"use client";

import { TTextType } from "./text.types";
import { createElement, HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

interface IBaseTextProps extends HTMLAttributes<HTMLElement> {
  type?: TTextType;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span" | "p";
}

const textClasses: Record<TTextType, string> = {
  h1: "text-4xl font-light leading-[1.167] sm:text-5xl md:text-[5rem]",
  h2: "text-3xl font-light leading-[1.2] sm:text-4xl md:text-[3.5rem]",
  h3: "text-2xl font-normal leading-[1.167] sm:text-3xl md:text-[2.5rem]",
  h4: "text-xl font-bold leading-[1.235] sm:text-2xl md:text-[1.75rem]",
  h5: "text-xl font-bold leading-[1.334] md:text-2xl",
  h6: "text-lg font-bold leading-[1.6] md:text-xl",
  body1: "leading-6 text-base",
  body2: "leading-6 text-sm",
  caption: "leading-6 text-xs",
};

const BaseText = ({ children, type = "body1", as, className, ...props }: IBaseTextProps) => {
  const combinedClassName = twMerge(textClasses[type], className);
  const element =
    as ?? (type === "body1" || type === "body2" || type === "caption" ? "span" : type);

  return createElement(element, { className: combinedClassName, ...props }, children);
};

export default BaseText;
