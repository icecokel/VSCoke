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
    // TODO 마지막이 지워질때,
    // 리시트가 없을때
    const prevItemIndex = history.findIndex(item => item.path === path);
    const historyToUpdate = [...history]
      .filter(item => item.path !== path)
      .map((item, index) => ({ ...item, isAactive: index === prevItemIndex }));
    if (prevItemIndex >= 0) {
      setHistory(historyToUpdate);
      const nextPath =
        historyToUpdate[prevItemIndex].path ?? historyToUpdate[historyToUpdate.length - 1].path;
      console.log(nextPath);
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
    history,
    add,
    remove,
    change,
  };
};

export default useHistory;
