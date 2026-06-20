"use client";

import {
  ChevronDown,
  Coffee,
  FlaskConical,
  Gauge,
  History,
  ListChecks,
  SlidersHorizontal,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { espressoParamsToPairs, sortEspressoRoundsByRecent } from "@/features/hobby/lib/espresso";
import type { EspressoBean, EspressoLog, EspressoRound } from "@/features/hobby/types/espresso";

type EspressoLogViewProps = {
  bean: EspressoBean;
};

type DetailSelection =
  | { type: "current"; beanId: string; logId: string }
  | { type: "next"; beanId: string; logId: string }
  | { type: "guide"; beanId: string; logId: string }
  | { type: "history"; beanId: string; logId: string }
  | { type: "round"; beanId: string; logId: string; roundId: string };

type ActiveContext = {
  bean?: EspressoBean;
  log?: EspressoLog;
  round?: EspressoRound;
};

const Chip = ({ children }: { children: ReactNode }) => {
  return (
    <span className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs font-medium text-gray-300">
      {children}
    </span>
  );
};

const TreeButton = ({
  children,
  depth,
  isActive = false,
  onClick,
}: {
  children: ReactNode;
  depth: number;
  isActive?: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex min-h-9 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition",
        depth === 0 ? "font-semibold" : "font-medium",
        isActive
          ? "border border-blue-300/40 bg-blue-300/10 text-blue-100"
          : "border border-transparent text-gray-300 hover:border-gray-700 hover:bg-gray-900",
      ].join(" ")}
      style={{ paddingLeft: `${12 + depth * 18}px` }}
    >
      {children}
    </button>
  );
};

const SpecGrid = ({ pairs }: { pairs: Array<{ label: string; value: string }> }) => {
  if (pairs.length === 0) {
    return null;
  }

  return (
    <dl className="grid grid-cols-2 gap-2 md:grid-cols-3">
      {pairs.map(pair => (
        <div
          key={`${pair.label}-${pair.value}`}
          className="rounded-md border border-gray-800 bg-gray-950 p-3"
        >
          <dt className="text-xs text-gray-500">{pair.label}</dt>
          <dd className="mt-1 text-sm font-semibold text-gray-100">{pair.value}</dd>
        </div>
      ))}
    </dl>
  );
};

const TextList = ({ items }: { items: string[] }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-2 text-sm leading-6 text-gray-300">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-300" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
};

const SectionPanel = ({ children, title }: { children: ReactNode; title: string }) => {
  return (
    <section className="rounded-lg border border-gray-800 bg-gray-950 p-4">
      <h4 className="mb-3 text-xs font-semibold tracking-wide text-blue-200 uppercase">{title}</h4>
      {children}
    </section>
  );
};

const AnalysisSection = ({ title, items }: { title: string; items: string[] }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-md border border-gray-800 bg-gray-950 p-3">
      <h5 className="mb-2 text-xs font-semibold tracking-wide text-blue-200 uppercase">{title}</h5>
      <TextList items={items} />
    </section>
  );
};

const CurrentSettingDetail = ({ bean, log }: { bean: EspressoBean; log: EspressoLog }) => {
  const latestRound = sortEspressoRoundsByRecent(log.rounds)[0];
  const equipmentPairs = espressoParamsToPairs(bean.defaultEquipment);
  const latestRecipePairs = espressoParamsToPairs(latestRound?.recipe);
  const latestResultPairs = espressoParamsToPairs({
    extractionTime: latestRound?.result.extractionTime,
    pressure: latestRound?.result.pressure,
  });

  return (
    <div className="space-y-4">
      <SectionPanel title="장비 기본">
        <SpecGrid pairs={equipmentPairs} />
      </SectionPanel>

      <SectionPanel title="현재 조건">
        <div className="flex flex-wrap gap-2">
          {(log.currentAnalysis?.conditions ?? []).map(condition => (
            <Chip key={condition}>{condition}</Chip>
          ))}
        </div>
      </SectionPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionPanel title="최근 추출 세팅">
          <SpecGrid pairs={latestRecipePairs} />
        </SectionPanel>
        <SectionPanel title="최근 결과">
          <div className="space-y-3">
            <SpecGrid pairs={latestResultPairs} />
            <TextList
              items={[...(latestRound?.result.taste ?? []), ...(latestRound?.result.notes ?? [])]}
            />
          </div>
        </SectionPanel>
      </div>

      <AnalysisSection title="현재 의심 지점" items={log.currentAnalysis?.suspectedIssues ?? []} />
    </div>
  );
};

const RoundCard = ({ round }: { round: EspressoRound }) => {
  const recipePairs = espressoParamsToPairs(round.recipe);
  const resultPairs = espressoParamsToPairs({
    extractionTime: round.result.extractionTime,
    pressure: round.result.pressure,
  });

  return (
    <article className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-800 pb-3">
        <div>
          <h4 className="text-lg font-semibold text-gray-50">라운드 {round.roundNumber}</h4>
          {round.date && <p className="mt-1 text-xs text-gray-500">{round.date}</p>}
        </div>
        {round.recipe.grind && <Chip>분쇄도 {round.recipe.grind}</Chip>}
      </div>

      <div className="mt-4 space-y-4">
        <section>
          <h5 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-blue-200 uppercase">
            <Gauge className="size-4" />
            추출 조건
          </h5>
          <SpecGrid pairs={recipePairs} />
        </section>

        <section>
          <h5 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-blue-200 uppercase">
            <Coffee className="size-4" />
            결과
          </h5>
          <div className="space-y-3">
            <SpecGrid pairs={resultPairs} />
            <TextList items={[...(round.result.taste ?? []), ...(round.result.notes ?? [])]} />
          </div>
        </section>

        <div className="grid gap-3 lg:grid-cols-2">
          <AnalysisSection
            title="변경 / 메모"
            items={[...(round.analysis?.changes ?? []), ...(round.analysis?.notes ?? [])]}
          />
          <AnalysisSection title="판단" items={round.analysis?.judgments ?? []} />
          <AnalysisSection title="추론" items={round.analysis?.inferences ?? []} />
          <AnalysisSection title="다음 액션" items={round.nextActions} />
        </div>
      </div>
    </article>
  );
};

const NextTestDetail = ({ log }: { log: EspressoLog }) => {
  if (!log.nextTest && !log.nextDirection?.length && !log.finalHypothesis?.length) {
    return null;
  }

  const recipePairs = espressoParamsToPairs(log.nextTest?.recipe);

  return (
    <div className="space-y-4">
      {log.nextTest?.targetRoundNumber && <Chip>목표 라운드 {log.nextTest.targetRoundNumber}</Chip>}

      <div className="grid gap-4 lg:grid-cols-3">
        <AnalysisSection title="가설" items={log.finalHypothesis ?? []} />
        <AnalysisSection title="방향" items={log.nextDirection ?? log.nextTest?.goals ?? []} />
        <AnalysisSection title="기대 결과" items={log.nextTest?.expectedResult ?? []} />
      </div>

      {recipePairs.length > 0 && (
        <SectionPanel title="추출 세팅">
          <SpecGrid pairs={recipePairs} />
        </SectionPanel>
      )}

      {log.nextTest?.method?.length ? (
        <SectionPanel title="추출 진행">
          <div className="space-y-3">
            {log.nextTest.method.map(step => (
              <div key={step.time} className="rounded-md border border-gray-800 bg-gray-900 p-3">
                <p className="text-sm font-semibold text-gray-100">{step.time}</p>
                <TextList items={step.steps} />
              </div>
            ))}
          </div>
        </SectionPanel>
      ) : null}
    </div>
  );
};

const GuideDetail = ({ log }: { log: EspressoLog }) => {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {(log.adjustmentGuide ?? []).map(guide => (
        <section
          key={guide.condition}
          className="rounded-lg border border-gray-800 bg-gray-950 p-4"
        >
          <h4 className="text-sm font-semibold text-gray-100">{guide.condition}</h4>
          <p className="mt-2 text-sm leading-6 text-gray-300">{guide.action}</p>
        </section>
      ))}
    </div>
  );
};

const HistoryDetail = ({ log }: { log: EspressoLog }) => {
  const sortedRounds = sortEspressoRoundsByRecent(log.rounds);

  return (
    <div className="space-y-3">
      {sortedRounds.map(round => (
        <section key={round.id} className="rounded-lg border border-gray-800 bg-gray-950 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-lg font-semibold text-gray-50">라운드 {round.roundNumber}</h4>
              {round.date && <p className="mt-1 text-xs text-gray-500">{round.date}</p>}
            </div>
            {round.recipe.grind && <Chip>분쇄도 {round.recipe.grind}</Chip>}
          </div>
          <div className="mt-3">
            <TextList items={[...(round.result.taste ?? []), ...(round.result.notes ?? [])]} />
          </div>
        </section>
      ))}
    </div>
  );
};

const DetailPanel = ({
  context,
  selection,
}: {
  context: ActiveContext;
  selection: DetailSelection;
}) => {
  if (!context.bean || !context.log) {
    return null;
  }

  const titleMap: Record<DetailSelection["type"], string> = {
    current: "현재 기준 세팅",
    next: "다음 테스트 세팅",
    guide: "조정 가이드",
    history: "히스토리",
    round: context.round ? `라운드 ${context.round.roundNumber}` : "라운드",
  };

  return (
    <section className="min-w-0 rounded-lg border border-gray-700 bg-gray-900 p-4 md:p-5">
      <div className="mb-5 flex flex-col gap-3 border-b border-gray-800 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-gray-500 uppercase">
            {context.bean.roaster ?? "Roaster"}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-gray-50">{titleMap[selection.type]}</h2>
          <p className="mt-2 text-sm text-gray-400">{context.bean.name}</p>
        </div>
        <Chip>{context.log.rounds.length} rounds</Chip>
      </div>

      {selection.type === "current" && (
        <CurrentSettingDetail bean={context.bean} log={context.log} />
      )}
      {selection.type === "next" && <NextTestDetail log={context.log} />}
      {selection.type === "guide" && <GuideDetail log={context.log} />}
      {selection.type === "history" && <HistoryDetail log={context.log} />}
      {selection.type === "round" && context.round && <RoundCard round={context.round} />}
    </section>
  );
};

export const EspressoLogView = ({ bean }: EspressoLogViewProps) => {
  const initialSelection = useMemo<DetailSelection | null>(() => {
    const log = bean?.logs[0];

    if (!log) {
      return null;
    }

    return { type: "current", beanId: bean.id, logId: log.id };
  }, [bean]);
  const [selection, setSelection] = useState<DetailSelection | null>(initialSelection);

  const activeSelection = selection ?? initialSelection;
  const context = useMemo<ActiveContext>(() => {
    if (!activeSelection) {
      return {};
    }

    const log = bean.logs.find(item => item.id === activeSelection.logId);
    const round =
      activeSelection.type === "round"
        ? log?.rounds.find(item => item.id === activeSelection.roundId)
        : undefined;

    return { bean, log, round };
  }, [activeSelection, bean]);

  const isActive = (
    type: DetailSelection["type"],
    beanId: string,
    logId: string,
    roundId?: string,
  ) => {
    if (!activeSelection) {
      return false;
    }

    if (
      activeSelection.type !== type ||
      activeSelection.beanId !== beanId ||
      activeSelection.logId !== logId
    ) {
      return false;
    }

    if (activeSelection.type === "round") {
      return activeSelection.roundId === roundId;
    }

    return true;
  };

  const select = (nextSelection: DetailSelection) => {
    setSelection(nextSelection);
  };

  return (
    <div className="min-h-full bg-gray-950 text-gray-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:px-6 md:py-8">
        <header className="border-b border-gray-800 pb-5">
          <p className="text-xs font-semibold tracking-[0.18em] text-blue-200 uppercase">
            Hobby / Espresso
          </p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-50 md:text-4xl">{bean.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                에스프레소 추출 조건, 맛 변화, 다음 테스트 방향을 누적한 원두 기록입니다.
              </p>
            </div>
            <p className="text-sm font-medium text-gray-300">{bean.roaster ?? "Roaster"}</p>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside
            data-testid="espresso-navigation-tree"
            className="h-fit rounded-lg border border-gray-700 bg-gray-900 p-3"
          >
            <div className="mb-3 flex items-center gap-2 px-2 text-xs font-semibold tracking-[0.16em] text-blue-200 uppercase">
              <SlidersHorizontal className="size-4" />
              추출 세팅
            </div>

            <div className="space-y-1">
              {bean.logs.map(log => {
                const sortedRounds = sortEspressoRoundsByRecent(log.rounds);

                return (
                  <div key={log.id} className="space-y-1">
                    <TreeButton
                      depth={0}
                      isActive={context.log?.id === log.id}
                      onClick={() => select({ type: "current", beanId: bean.id, logId: log.id })}
                    >
                      <ChevronDown className="size-4 shrink-0" />
                      <span>추출 세팅</span>
                    </TreeButton>

                    <TreeButton
                      depth={1}
                      isActive={isActive("current", bean.id, log.id)}
                      onClick={() => select({ type: "current", beanId: bean.id, logId: log.id })}
                    >
                      <FlaskConical className="size-4 shrink-0" />
                      <span>현재 기준 세팅</span>
                    </TreeButton>
                    <TreeButton
                      depth={1}
                      isActive={isActive("next", bean.id, log.id)}
                      onClick={() => select({ type: "next", beanId: bean.id, logId: log.id })}
                    >
                      <ListChecks className="size-4 shrink-0" />
                      <span>다음 테스트 세팅</span>
                    </TreeButton>
                    <TreeButton
                      depth={1}
                      isActive={isActive("guide", bean.id, log.id)}
                      onClick={() => select({ type: "guide", beanId: bean.id, logId: log.id })}
                    >
                      <SlidersHorizontal className="size-4 shrink-0" />
                      <span>조정 가이드</span>
                    </TreeButton>
                    <TreeButton
                      depth={1}
                      isActive={isActive("history", bean.id, log.id)}
                      onClick={() => select({ type: "history", beanId: bean.id, logId: log.id })}
                    >
                      <History className="size-4 shrink-0" />
                      <span>히스토리</span>
                    </TreeButton>
                    {sortedRounds.map(round => (
                      <TreeButton
                        key={round.id}
                        depth={2}
                        isActive={isActive("round", bean.id, log.id, round.id)}
                        onClick={() =>
                          select({
                            type: "round",
                            beanId: bean.id,
                            logId: log.id,
                            roundId: round.id,
                          })
                        }
                      >
                        <Gauge className="size-4 shrink-0" />
                        <span>라운드 {round.roundNumber}</span>
                      </TreeButton>
                    ))}
                  </div>
                );
              })}
            </div>
          </aside>

          {activeSelection && <DetailPanel context={context} selection={activeSelection} />}
        </div>
      </div>
    </div>
  );
};
