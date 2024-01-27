"use client";

import { TKind, TShape, TSize } from "./types";
import { HTMLAttributes, createElement } from "react";

interface IIconProps extends HTMLAttributes<HTMLSpanElement> {
  kind: TKind;
  shape?: TShape;
  size?: TSize;
}

const SIZE_MAP: Record<TSize, string> = {
  xs: "12px",
  sm: "16px",
  md: "24px",
  lg: "32px",
  xl: "48px",
};

/**
 * @see https://fonts.google.com/icons?icon.set=Material+Symbols&icon.style=Outlined
 * @returns google font icon
 */

const Icon = ({ kind, shape = "rounded", size = "md", className, ...restProps }: IIconProps) => {
  return createElement("span", {
    className: `material-symbols-${shape} ${className}`,
    dangerouslySetInnerHTML: { __html: kind },
    style: {
      fontSize: SIZE_MAP[size],
    },
    ...restProps,
  });
};

export default Icon;
