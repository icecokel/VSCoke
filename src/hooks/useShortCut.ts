import useKeyPress from "@/hooks/useKeyPress";
import { useEffect } from "react";

const useShortCut = (keys: string[], cb: Function) => {
  const { pushedKey, isSubset } = useKeyPress();

  useEffect(() => {
    // TODO 맥일때 확인
    if (isSubset(keys)) {
      cb();
    }
  }, [pushedKey]);
};

export default useShortCut;
