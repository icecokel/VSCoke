import { Coffee, Gauge } from "lucide-react";

import { CustomLink } from "@/components/custom-link";
import { formatEspressoValue } from "@/features/hobby/lib/espresso";
import type { EspressoBean } from "@/features/hobby/types/espresso";

type EspressoBeanListProps = {
  beans: EspressoBean[];
};

const BeanGoal = ({ children }: { children: string }) => {
  return (
    <span className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs font-medium text-gray-300">
      {children}
    </span>
  );
};

export const EspressoBeanList = ({ beans }: EspressoBeanListProps) => {
  return (
    <div className="min-h-full bg-gray-950 text-gray-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:px-6 md:py-8">
        <header className="border-b border-gray-800 pb-5">
          <p className="text-xs font-semibold tracking-[0.18em] text-blue-200 uppercase">
            Hobby / Espresso
          </p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-50 md:text-4xl">원두 기록</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                원두별 에스프레소 추출 조건, 맛 변화, 다음 테스트 방향을 관리합니다.
              </p>
            </div>
            <p className="text-sm font-medium text-gray-300">총 {beans.length}개 원두</p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {beans.map(bean => {
            const rounds = bean.logs.flatMap(log => log.rounds);
            const latestRound = rounds.at(-1);
            const latestExtraction = formatEspressoValue(
              latestRound?.recipe.extractionTime ?? latestRound?.result.extractionTime,
            );

            return (
              <CustomLink
                key={bean.id}
                href={`/hobby/espresso/${bean.id}`}
                title={bean.name}
                className="group flex min-h-52 flex-col justify-between rounded-lg border border-gray-700 bg-gray-900 p-5 text-left transition-colors hover:border-blue-300/70 hover:bg-gray-850 focus-visible:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-300/30 focus-visible:outline-none"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-gray-500 uppercase">
                    <Coffee className="size-4" />
                    {bean.roaster ?? "Roaster"}
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-gray-50">{bean.name}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {bean.goals.map(goal => (
                      <BeanGoal key={`${bean.id}-${goal}`}>{goal}</BeanGoal>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border border-gray-800 bg-gray-950 p-3">
                    <div className="text-xs text-gray-500">라운드</div>
                    <div className="mt-1 text-lg font-bold text-gray-100">{rounds.length}</div>
                  </div>
                  <div className="rounded-md border border-gray-800 bg-gray-950 p-3">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Gauge className="size-3" />
                      최근 추출
                    </div>
                    <div className="mt-1 text-lg font-bold text-gray-100">{latestExtraction}</div>
                  </div>
                </div>

                <span className="mt-5 text-sm font-medium text-blue-200 transition-colors group-hover:text-blue-100">
                  추출 기록 보기
                </span>
              </CustomLink>
            );
          })}
        </section>
      </div>
    </div>
  );
};
