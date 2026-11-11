import type { EspressoBean } from "@/features/hobby/types/espresso";

export type DetailSelection =
  | { type: "current" | "next" | "guide" | "history"; beanId: string; logId: string }
  | { type: "round"; beanId: string; logId: string; roundId: string };

export const getEspressoSelection = (
  bean: EspressoBean,
  params: Pick<URLSearchParams, "get" | "getAll">,
): DetailSelection | null => {
  if (["log", "round", "detail"].some(key => params.getAll(key).length > 1)) return null;

  const logId = params.get("log");
  const log = logId === null ? bean.logs[0] : bean.logs.find(item => item.id === logId);
  if (!log) return null;

  const roundId = params.get("round");
  const detail = params.get("detail");
  if (roundId !== null) {
    if (detail !== null || !log.rounds.some(round => round.id === roundId)) return null;
    return { type: "round", beanId: bean.id, logId: log.id, roundId };
  }

  const type = detail ?? "current";
  if (type !== "current" && type !== "next" && type !== "guide" && type !== "history") {
    return null;
  }
  return { type, beanId: bean.id, logId: log.id };
};
