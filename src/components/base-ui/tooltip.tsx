"use client";

import BaseText from "./text";
import { TParentNode } from "@/models/common";
import { useState } from "react";

interface ITooltipProps extends TParentNode {
  text: string;
  placement?: "bottom";
}

const Tooltip = ({ children, text }: ITooltipProps) => {
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
          className="bg-gray-900 text-white/90 absolute rounded-sm text-xs translate-y-12"
          type="caption"
        >
          {text}
        </BaseText>
      )}
    </div>
  );
};

export default Tooltip;
