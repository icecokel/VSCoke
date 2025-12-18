import { RefObject, useEffect, useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useClickOutSide = (onClickOutSide: (event: MouseEvent) => void): RefObject<any> => {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const handleClickOutSide = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickOutSide(event);
      }
    };

    window.addEventListener("mousedown", handleClickOutSide);
    return () => {
      window.removeEventListener("mousedown", handleClickOutSide);
    };
  }, [onClickOutSide]);

  return ref;
};
