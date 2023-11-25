import { IHistoryItem, historyAtom } from "@/atom/history";
import { useAtom } from "jotai/react";
import { useRouter } from "next/navigation";

const useHistory = () => {
  const [history, setHistory] = useAtom(historyAtom);
  const router = useRouter();

  const add = ({ path, title }: IHistoryItem) => {
    if (history.some(item => item.path === path)) {
      change({ path, title, isActive: true });
      return;
    }
    setHistory(prev => {
      return [...prev.map(item => ({ ...item, isActive: false })), { isActive: true, path, title }];
    });
  };

  const remove = ({ path }: IHistoryItem) => {
    const prevItemIndex = history.findIndex(item => item.path === path);
    const isLast = prevItemIndex === history.length - 1;

    const historyToUpdate = [...history]
      .filter(item => item.path !== path)
      .map((item, index) => ({
        ...item,
        isActive: index === (isLast ? prevItemIndex - 1 : prevItemIndex),
      }));

    if (prevItemIndex >= 0) {
      const nextPath =
        historyToUpdate[prevItemIndex]?.path ?? historyToUpdate[historyToUpdate.length - 1]?.path;

      setHistory(historyToUpdate);

      router.replace(historyToUpdate.length === 0 ? "/VSCoke" : nextPath);
    }
  };

  const change = ({ path }: IHistoryItem) => {
    setHistory(prev => prev.map(item => ({ ...item, isActive: item.path === path })));
    router.push(path);
  };

  return {
    current: history.find(item => item.isActive),
    history,
    setHistory,
    add,
    remove,
    change,
  };
};

export default useHistory;
