import BaseText from "../Text";
import styles from "./style.module.css";
import { IHaveChildren } from "@/models/common";
import { useState } from "react";

interface ITooltipProps extends IHaveChildren {
  text: string;
  placement?: "bottom";
}

const Tooltip = ({ children, placement = "bottom", text }: ITooltipProps) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleHover = () => {
    setShowTooltip(true);
  };

  const handleOut = () => {
    setShowTooltip(false);
  };
  return (
    <div className={styles.wrapper}>
      <div onMouseOver={handleHover} onMouseOut={handleOut}>
        {children}
      </div>
      {showTooltip && (
        <BaseText className={styles.text} type="caption">
          {text}
        </BaseText>
      )}
    </div>
  );
};

export default Tooltip;
