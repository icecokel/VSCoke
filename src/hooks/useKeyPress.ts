import { useCallback, useEffect, useState } from "react";

const useKeyPress = () => {
  const [pushedKey, setPushedKey] = useState<string[]>([]);

  const handleKeyDown = useCallback(({ key }: KeyboardEvent) => {
    setPushedKey(prev => {
      if (prev.includes(key.toLowerCase())) {
        return prev;
      }
      return [...prev, key.toLowerCase()];
    });
  }, []);

  const handleKeyUp = useCallback(({ key }: KeyboardEvent) => {
    setPushedKey(prev => {
      if (prev.includes(key.toLowerCase())) {
        return prev.filter(item => item !== key.toLowerCase());
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const isSubset = (target: string[]) => {
    return target.every(key => {
      return pushedKey.includes(key);
    });
  };

  return { pushedKey, isSubset };
};

export default useKeyPress;
