'use client';

import React, { HTMLAttributes, ReactNode } from 'react';
import Slide, { ISlideProps } from './slide';

interface ISlideGroupProps extends Omit<ISlideProps, 'delay'> {
  children: ReactNode;
  delay?: number;
  className?: HTMLAttributes<HTMLDivElement>['className'];
}

const SlideGroup = ({ children, delay = 250, direction, className }: ISlideGroupProps) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => {
        return (
          <Slide active delay={delay * index + 1} fillMode="backwards" direction={direction}>
            {child}
          </Slide>
        );
      })}
    </div>
  );
};

export default SlideGroup;
