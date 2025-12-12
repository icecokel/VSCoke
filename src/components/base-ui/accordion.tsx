"use client";

import { TParentNode } from "@/models/common";
import { HTMLAttributes, createElement, useState } from "react";
import { AccordionContext, DEFAULT_VALUE } from "./accordion-context";

interface IAccordionProps extends TParentNode {
  className?: HTMLAttributes<HTMLDivElement>["className"];
}

const Accordion = ({ children, className }: IAccordionProps) => {
  const [expanded, setExpanded] = useState<boolean>(DEFAULT_VALUE.expanded);

  const onToggle = () => {
    setExpanded(prev => !prev);
  };
  return (
    <AccordionContext.Provider value={{ expanded, toggle: onToggle }}>
      {createElement("div", { className: className ?? "w-full p-2" }, children)}
    </AccordionContext.Provider>
  );
};

export default Accordion;
