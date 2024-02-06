"use client";

import { HTMLAttributes, createElement } from "react";

type TDirection = "up" | "down" | "right" | "left";

interface ISlideProps extends HTMLAttributes<HTMLDivElement> {
  direction?: TDirection;
  duration?: number;
  active: boolean;
}

const OPEN_MAP: Record<TDirection, string> = {
  up: "animate-[slide-up]",
  down: "animate-[slide-down]",
  right: "animate-[slide-right]",
  left: "animate-[slide-left]",
};

const CLOSE_MAP: Record<TDirection, string> = {
  up: "animate-[slide-up-close]",
  down: "animate-[slide-down-close]",
  right: "animate-[slide-right-close]",
  left: "animate-[slide-left-close]",
};

const Slide = ({ active, direction = "up", duration = 300, ...restProps }: ISlideProps) => {
  return createElement("div", {
    ...restProps,
    className: active ? OPEN_MAP[direction] : CLOSE_MAP[direction],
    style: {
      animationFillMode: "forwards",
      animationDuration: `${duration}ms`,
      zIndex: active ? 1 : -100,
    },
  });
};

export default Slide;
