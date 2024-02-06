"use client";

import { HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

type TDirection = "up" | "down" | "right" | "left";

interface ISlideProps extends HTMLAttributes<HTMLDivElement> {
  direction?: TDirection;
  duration?: number;
  active: boolean;
}

const Slide = ({ children, direction = "up", duration = 300, active }: ISlideProps) => {
  return (
    <div
      className={twMerge(active ? "animate-[slideRight]" : "animate-[slideRightClose]")}
      style={{
        animationFillMode: "forwards",
        animationDuration: `${duration}ms`,
        animationDirection: "alternate",
      }}
    >
      {children}
    </div>
  );
};

export default Slide;
