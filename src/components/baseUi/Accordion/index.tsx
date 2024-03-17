"use client";

import Icon from "../Icon";
import Slide from "../Slide";
import BaseText from "../Text";
import { IHaveChildren } from "@/models/common";
import { createContext, useContext, useState } from "react";

interface IAccordion {
  expanded: boolean;
  toggle: () => void;
}

interface IAccordionProps extends IHaveChildren {}

const DEFAULT_VALUE: IAccordion = {
  expanded: false,
  toggle: () => {},
};

const AccordionContext = createContext<IAccordion>(DEFAULT_VALUE);

const Accordion = ({ children }: IAccordionProps) => {
  const [expanded, setExpanded] = useState<boolean>(DEFAULT_VALUE.expanded);

  const onToggle = () => {
    setExpanded(prev => !prev);
  };
  return (
    <div className="p-5">
      <AccordionContext.Provider value={{ expanded, toggle: onToggle }}>
        {children}
      </AccordionContext.Provider>
    </div>
  );
};

export default Accordion;

Accordion.Summary = ({ children }: IHaveChildren) => {
  const { expanded, toggle } = useContext(AccordionContext);
  const handleClickToggle = toggle;
  return (
    <button
      className="flex items-center justify-between border border-gray-500 rounded p-2 w-full"
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
      <div className="p-2 border border-gray-500 rounded mt-2">{children}</div>
    </Slide>
  );
};
