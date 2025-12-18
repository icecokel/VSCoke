import { RefObject, useEffect, useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useClickOutSide = (onClickOutSide: () => void): RefObject<any> => {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const handleClickOutSide = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickOutSide();
      }
    };

    window.addEventListener("mousedown", handleClickOutSide);
    return () => {
      window.removeEventListener("mousedown", handleClickOutSide);
    };
  }, [onClickOutSide]);

  return ref;
};

export default useClickOutSide;
