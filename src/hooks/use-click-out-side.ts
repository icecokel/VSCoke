import { RefObject, useEffect, useRef } from "react";

export const useClickOutSide = <T extends HTMLElement = HTMLElement>(
  onClickOutSide: (event: MouseEvent) => void,
): RefObject<T | null> => {
  const ref = useRef<T>(null);
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
