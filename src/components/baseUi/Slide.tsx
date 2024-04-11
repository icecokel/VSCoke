"use client";

import { CSSProperties, HTMLAttributes, createElement } from "react";

type TDirection = "up" | "down" | "right" | "left";

interface ISlideProps extends HTMLAttributes<HTMLDivElement> {
  active: boolean;
  direction?: TDirection;
  duration?: number;
  delay?: number;
  fillMode?: CSSProperties["animationFillMode"];
}

const OPEN_MAP: Record<TDirection, HTMLAttributes<HTMLDivElement>["className"]> = {
  up: "animate-[slide-up]",
  down: "animate-[slide-down]",
  right: "animate-[slide-right]",
  left: "animate-[slide-left]",
};

const CLOSE_MAP: Record<TDirection, HTMLAttributes<HTMLDivElement>["className"]> = {
  up: "animate-[slide-up-close]",
  down: "animate-[slide-down-close]",
  right: "animate-[slide-right-close]",
  left: "animate-[slide-left-close]",
};

const Slide = ({
  active,
  direction = "up",
  duration = 300,
  delay = 0,
  fillMode = "forwards",
  ...restProps
}: ISlideProps) => {
  return createElement("div", {
    ...restProps,
    className: active ? OPEN_MAP[direction] : CLOSE_MAP[direction],
    style: {
      animationFillMode: fillMode,
      animationDuration: `${duration}ms`,
      animationDelay: `${delay}ms`,
    },
  });
};

export default Slide;
