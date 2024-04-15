"use client";

import { TKind, TShape } from "./types";
import { HTMLAttributes, createElement } from "react";

interface IIconProps extends HTMLAttributes<HTMLSpanElement> {
  kind: TKind;
  shape?: TShape;
  size?: number;
}

/**
 * @see https://fonts.google.com/icons?icon.set=Material+Symbols&icon.style=Outlined
 * @returns google font icon
 */

const Icon = ({ kind, shape = "rounded", className, size, style, ...restProps }: IIconProps) => {
  return createElement("span", {
    className: `material-symbols-${shape} ${className}`,
    style: { fontSize: size, ...style },
    dangerouslySetInnerHTML: { __html: kind },
    ...restProps,
  });
};

export default Icon;
