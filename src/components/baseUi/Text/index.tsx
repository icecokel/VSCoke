"use client";

import styles from "./style.module.css";
import { TTextType } from "./type";
import { HTMLAttributes, createElement } from "react";

interface IBaseTextProps extends HTMLAttributes<HTMLSpanElement> {
  type?: TTextType;
}

const BaseText = ({ children, type = "body1", ...props }: IBaseTextProps) => {
  if (!["body1", "body2", "caption"].includes(type)) {
    return createElement(type, { className: styles[type], ...props }, children);
  }
  return createElement("span", { className: styles[type], ...props }, children);
};

export default BaseText;
