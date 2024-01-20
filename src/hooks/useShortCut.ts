import useKeyPress from "@/hooks/useKeyPress";
import { useEffect } from "react";

const useShortCut = (keys: KeyboardEvent["key"][], cb: Function) => {
  const { pushedKey, isSubset } = useKeyPress();

  useEffect(() => {
    if (isSubset(keys)) {
      cb();
    }
  }, [pushedKey]);
};

export default useShortCut;
