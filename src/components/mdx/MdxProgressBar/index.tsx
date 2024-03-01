import styles from "./style.module.css";
import { HTMLAttributes, createElement } from "react";

interface MdxProgressBarProps extends HTMLAttributes<HTMLProgressElement> {
  max: string | number;
  value: string | number;
}

const MdxProgressBar = (props: MdxProgressBarProps) => {
  return createElement("progress", { ...props, className: styles.progress });
};

export default MdxProgressBar;
