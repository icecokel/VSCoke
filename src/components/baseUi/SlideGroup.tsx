"use client";

import Slide from "./Slide";
import { IHaveChildren } from "@/models/common";
import React from "react";

interface ISlideGroupProps extends IHaveChildren {
  delay?: number;
}

const SlideGroup = ({ children, delay = 250 }: ISlideGroupProps) => {
  return React.Children.map(children, (child, index) => {
    return (
      <Slide active delay={delay * index} fillMode="backwards">
        {child}
      </Slide>
    );
  });
};

export default SlideGroup;
