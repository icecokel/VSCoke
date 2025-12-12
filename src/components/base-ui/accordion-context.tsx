"use client";

import { createContext } from "react";

export interface IAccordion {
  expanded: boolean;
  toggle: () => void;
}

export const DEFAULT_VALUE: IAccordion = {
  expanded: false,
  toggle: () => {},
};

export const AccordionContext = createContext<IAccordion>(DEFAULT_VALUE);
