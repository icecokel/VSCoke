'use client';

import { CSSProperties, HTMLAttributes, createElement } from 'react';

type TDirection = 'up' | 'down' | 'right' | 'left';

export interface ISlideProps extends HTMLAttributes<HTMLDivElement> {
  active: boolean;
  direction?: TDirection;
  duration?: number;
  delay?: number;
  fillMode?: CSSProperties['animationFillMode'];
}

const OPEN_MAP: Record<TDirection, string> = {
  up: 'slide-up',
  down: 'slide-down',
  right: 'slide-right',
  left: 'slide-left',
};

const CLOSE_MAP: Record<TDirection, string> = {
  up: 'slide-up-close',
  down: 'slide-down-close',
  right: 'slide-right-close',
  left: 'slide-left-close',
};

const Slide = ({
  active,
  direction = 'up',
  duration = 300,
  delay = 0,
  fillMode = 'forwards',
  ...restProps
}: ISlideProps) => {
  const open = OPEN_MAP[direction];
  const close = CLOSE_MAP[direction];

  return createElement('div', {
    ...restProps,
    style: {
      animationName: active ? open : close,
      animationFillMode: fillMode,
      animationDuration: `${duration}ms`,
      animationDelay: `${delay}ms`,
    },
  });
};

export default Slide;
