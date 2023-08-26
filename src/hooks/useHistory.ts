import { IHistoryItem, historyAtom } from "@/atom/history";
import { useAtom } from "jotai/react";
import { useRouter } from "next/navigation";

const useHistory = () => {
  const [history, setHistory] = useAtom(historyAtom);
  const router = useRouter();

  const add = ({ path, title }: IHistoryItem) => {
    if (history.some(item => item.path === path)) {
      change({ path, title, isAactive: true });
      return;
    }
    setHistory(prev => {
      return [
        ...prev.map(item => ({ ...item, isAactive: false })),
        { isAactive: true, path, title },
      ];
    });
  };

  const remove = ({ path }: IHistoryItem) => {
    const prevItemIndex = history.findIndex(item => item.path === path);
    const isLast = prevItemIndex === history.length - 1;

    const historyToUpdate = [...history]
      .filter(item => item.path !== path)
      .map((item, index) => ({
        ...item,
        isAactive: index === (isLast ? prevItemIndex - 1 : prevItemIndex),
      }));

    if (prevItemIndex >= 0) {
      const nextPath =
        historyToUpdate[prevItemIndex]?.path ?? historyToUpdate[historyToUpdate.length - 1]?.path;
      setHistory(historyToUpdate);
      if (historyToUpdate.length === 0) {
        router.replace("/");
        return;
      }

      router.replace(nextPath);
    }
  };

  const change = ({ isAactive, path }: IHistoryItem) => {
    if (!isAactive) {
      setHistory(prev => prev.map(item => ({ ...item, isAactive: item.path === path })));
      router.push(path);
    }
  };

  return {
    current: history.find(item => item.isAactive),
    history,
    setHistory,
    add,
    remove,
    change,
  };
};

export default useHistory;
