"use client";

import BaseText from "./text";
import { TParentNode } from "@/models/common";
import { useState } from "react";

interface ITooltipProps extends TParentNode {
  text: string;
  placement?: "top" | "bottom";
}

const Tooltip = ({ children, text, placement = "bottom" }: ITooltipProps) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleMouseEnter = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const placementStyles = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1",
  };

  return (
    <div className="relative inline-block">
      <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {children}
      </div>
      {showTooltip && (
        <div
          className={`absolute z-50 px-2 py-1 bg-gray-900 border border-gray-700 rounded shadow-lg whitespace-nowrap pointer-events-none ${placementStyles[placement]}`}
        >
          <BaseText className="text-white/90 text-xs" type="caption">
            {text}
          </BaseText>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
