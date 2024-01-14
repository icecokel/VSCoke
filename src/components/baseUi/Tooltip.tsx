import BaseText from "./Text";
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
    <div className="flex justify-center w-fit">
      <div onMouseOver={handleHover} onMouseOut={handleOut}>
        {children}
      </div>
      {showTooltip && (
        <BaseText
          className="bg-gray-700 text-white/90 absolute p-1.5 rounded font-bold translate-y-full"
          type="caption"
        >
          {text}
        </BaseText>
      )}
    </div>
  );
};

export default Tooltip;
