"use client";

import { TParentNode } from "@/models/common";
import { useContext } from "react";
import { AccordionContext } from "./accordion-context";
import BaseText from "./text";
import Icon from "./icon";

const AccordionSummary = ({ children }: TParentNode) => {
  const { expanded, toggle } = useContext(AccordionContext);
  const handleClickToggle = toggle;
  return (
    <button
      className="flex items-center justify-between rounded-sm px-2 w-full"
      onClick={handleClickToggle}
    >
      <BaseText type="h6">{children}</BaseText>
      <Icon kind={expanded ? "expand_more" : "chevron_right"} />
    </button>
  );
};

export default AccordionSummary;
