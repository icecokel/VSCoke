import { useKeyPress } from "@/hooks/use-key-press";
import { useEffect } from "react";

/**
 *
 * @param keys @see https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
 * @param cb
 */
/**
 *
 * @param keys @see https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
 * @param cb
 */
export const useShortCut = (keys: KeyboardEvent["key"][], cb: () => void) => {
  const { pushedKey, isSubset } = useKeyPress();

  useEffect(() => {
    if (isSubset(keys)) {
      cb();
    }
  }, [pushedKey, cb, isSubset, keys]);
};
