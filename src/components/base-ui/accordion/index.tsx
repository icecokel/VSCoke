"use client";

import { TParentNode } from "@/models/common";
import Icon from "@/components/base-ui/icon";
import Slide from "@/components/base-ui/slide";
import BaseText from "@/components/base-ui/text";
import {
  HTMLAttributes,
  createContext,
  createElement,
  useContext,
  useState,
} from "react";

interface IAccordion {
  expanded: boolean;
  toggle: () => void;
}

interface IAccordionProps extends TParentNode {
  className?: HTMLAttributes<HTMLDivElement>["className"];
}

const DEFAULT_VALUE: IAccordion = {
  expanded: false,
  toggle: () => {},
};

const AccordionContext = createContext<IAccordion>(DEFAULT_VALUE);

const Accordion = ({ children, className }: IAccordionProps) => {
  const [expanded, setExpanded] = useState<boolean>(DEFAULT_VALUE.expanded);

  const onToggle = () => {
    setExpanded((prev) => !prev);
  };
  return (
    <AccordionContext.Provider value={{ expanded, toggle: onToggle }}>
      {createElement("div", { className: className ?? "w-full p-2" }, children)}
    </AccordionContext.Provider>
  );
};

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

const AccordionDetails = ({ children }: TParentNode) => {
  const { expanded } = useContext(AccordionContext);

  return (
    <Slide active={expanded} direction="down" duration={100}>
      <div className="px-2 mt-1 rounded-sm">{children}</div>
    </Slide>
  );
};

Accordion.Summary = AccordionSummary;
Accordion.Details = AccordionDetails;

export default Accordion;
