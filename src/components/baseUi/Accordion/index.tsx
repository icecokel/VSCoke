"use client";

import Icon from "../Icon";
import Slide from "../Slide";
import BaseText from "../Text";
import { IHaveChildren } from "@/models/common";
import { HTMLAttributes, createContext, createElement, useContext, useState } from "react";

interface IAccordion {
  expanded: boolean;
  toggle: () => void;
}

interface IAccordionProps extends IHaveChildren {
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
    setExpanded(prev => !prev);
  };
  return (
    <AccordionContext.Provider value={{ expanded, toggle: onToggle }}>
      {createElement("div", { children, className: className ?? "w-full p-2" })}
    </AccordionContext.Provider>
  );
};

export default Accordion;

Accordion.Summary = ({ children }: IHaveChildren) => {
  const { expanded, toggle } = useContext(AccordionContext);
  const handleClickToggle = toggle;
  return (
    <button
      className="flex items-center justify-between rounded px-2 w-full"
      onClick={handleClickToggle}
    >
      <BaseText type="h6">{children}</BaseText>
      <Icon kind={expanded ? "expand_more" : "chevron_right"} />
    </button>
  );
};

Accordion.Details = ({ children }: IHaveChildren) => {
  const { expanded } = useContext(AccordionContext);

  return (
    <Slide active={expanded} direction="down" duration={100}>
      <div className="px-2 mt-1 rounded">{children}</div>
    </Slide>
  );
};
