import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { SyncStringStorage } from "jotai/vanilla/utils/atomWithStorage";

export interface IHistoryItem {
  title: string;
  path: string;
  isAactive: boolean;
}

export const historyAtom = atomWithStorage<IHistoryItem[]>("history", [], {
  ...createJSONStorage(() => localHistory),
});

historyAtom.debugLabel = "historyAtom";

const localHistory: SyncStringStorage = {
  getItem: (key: string) => {
    return window.localStorage.getItem(key);
  },
  setItem: (key: string, newValue: string) => {
    return window.localStorage.setItem(key, newValue);
  },
  removeItem: (key: string) => {
    return window.localStorage.removeItem(key);
  },
};
