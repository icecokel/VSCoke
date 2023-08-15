import { atom } from "jotai";

export interface IHistoryItem {
  title: string;
  path: string;
  isAactive: boolean;
}

export const historyAtom = atom<IHistoryItem[]>([]);

historyAtom.debugLabel = "historyAtom";
