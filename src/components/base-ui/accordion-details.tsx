"use client";

import { TParentNode } from "@/models/common";
import { useContext } from "react";
import { AccordionContext } from "./accordion-context";
import Slide from "./slide";

const AccordionDetails = ({ children }: TParentNode) => {
  const { expanded } = useContext(AccordionContext);

  return (
    <Slide active={expanded} direction="down" duration={100}>
      <div className="px-2 mt-1 rounded-sm">{children}</div>
    </Slide>
  );
};

export default AccordionDetails;
