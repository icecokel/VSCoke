import { styles } from "./style";
import { TTextType } from "./type";
import { IHaveChildren } from "@/models/common";
import { createElement } from "react";

interface IBaseTextProps extends IHaveChildren {
  type?: TTextType;
  className?: string;
}

const BaseText = ({ children, type = "body1", className }: IBaseTextProps) => {
  if (!["body1", "body2", "caption"].includes(type)) {
    return createElement(type, { className, style: styles[type] }, children);
  }
  return createElement("span", { className, style: styles[type] }, children);
};

export default BaseText;
