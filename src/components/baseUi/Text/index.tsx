"use client";

import { styles } from "./style";
import { TTextType } from "./type";
import { HTMLAttributes, createElement } from "react";

interface IBaseTextProps extends HTMLAttributes<HTMLSpanElement> {
  type?: TTextType;
}

const BaseText = ({ children, type = "body1", style, ...props }: IBaseTextProps) => {
  if (!["body1", "body2", "caption"].includes(type)) {
    return createElement(type, { style: { ...styles[type], ...style }, ...props }, children);
  }
  return createElement("span", { style: { ...styles[type], ...style }, ...props }, children);
};

export default BaseText;
