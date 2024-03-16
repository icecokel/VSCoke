import { IHaveChildren } from "@/models/common";

interface IAccordionProps extends IHaveChildren {
  expanded: boolean;
}

const Accordion = ({ children }: IAccordionProps) => {
  return <div className="p-5">{children}</div>;
};

Accordion.Summary = ({ children }: IHaveChildren) => {
  return <div>{children}</div>;
};

Accordion.Details = ({ children }: IHaveChildren) => {
  return <div>{children}</div>;
};
