"use client";

import { TKind, TShape } from "./icon.types";
import { HTMLAttributes } from "react";

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
  return (
    <span
      className={`material-symbols-${shape} ${className || ""}`}
      style={{ fontSize: size, ...style }}
      {...restProps}
    >
      {kind}
    </span>
  );
};

export default Icon;
