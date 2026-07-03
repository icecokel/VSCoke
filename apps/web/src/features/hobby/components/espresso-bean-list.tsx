import { CalendarDays, Coffee, Gauge } from "lucide-react";

import { CustomLink } from "@/components/custom-link";
import {
  type EspressoFormatOptions,
  formatEspressoValue,
  getLatestEspressoRound,
  sortEspressoBeansByRecent,
} from "@/features/hobby/lib/espresso";
import type { EspressoBean } from "@/features/hobby/types/espresso";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("hobby.espresso");
  const sortedBeans = sortEspressoBeansByRecent(beans);
  const formatOptions: EspressoFormatOptions = {
    labels: {
      machine: t("labels.machine"),
      grinder: t("labels.grinder"),
      basket: t("labels.basket"),
      dosingShaker: t("labels.dosingShaker"),
      tamper: t("labels.tamper"),
      dose: t("labels.dose"),
      yield: t("labels.yield"),
      temperature: t("labels.temperature"),
      preinfusion: t("labels.preinfusion"),
      extractionTime: t("labels.extractionTime"),
      targetExtractionTime: t("labels.targetExtractionTime"),
      pressure: t("labels.pressure"),
      flow: t("labels.flow"),
      grind: t("labels.grind"),
    },
    maxSuffix: t("range.maxSuffix"),
    minSuffix: t("range.minSuffix"),
    units: {
      g: t("units.g"),
      sec: t("units.sec"),
      celsius: t("units.celsius"),
      bar: t("units.bar"),
    },
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
              <h1 className="text-3xl font-bold text-gray-50 md:text-4xl">{t("title")}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">{t("description")}</p>
            </div>
            <p className="text-sm font-medium text-gray-300">
              {t("total", { count: beans.length })}
            </p>
          </div>
        </header>

        {sortedBeans.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-2">
            {sortedBeans.map(bean => {
              const rounds = bean.logs.flatMap(log => log.rounds);
              const latestRound = getLatestEspressoRound(bean);
              const latestExtraction = formatEspressoValue(
                latestRound?.recipe.extractionTime ?? latestRound?.result.extractionTime,
                formatOptions,
              );
              const latestDate = latestRound?.date ?? "-";

              return (
                <CustomLink
                  key={bean.id}
                  data-testid="espresso-bean-card"
                  href={`/hobby/espresso/${bean.id}`}
                  title={bean.name}
                  className="group flex min-h-52 flex-col justify-between rounded-lg border border-gray-700 bg-gray-900 p-5 text-left transition-colors hover:border-blue-300/70 hover:bg-gray-850 focus-visible:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-300/30 focus-visible:outline-none"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-gray-500 uppercase">
                      <Coffee className="size-4" />
                      {bean.roaster ?? t("roasterFallback")}
                    </div>
                    <h2 className="mt-2 text-xl font-bold text-gray-50">{bean.name}</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {bean.goals.map(goal => (
                        <BeanGoal key={`${bean.id}-${goal}`}>{goal}</BeanGoal>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-md border border-gray-800 bg-gray-950 p-3">
                      <div className="text-xs text-gray-500">{t("round")}</div>
                      <div className="mt-1 text-lg font-bold text-gray-100">{rounds.length}</div>
                    </div>
                    <div className="rounded-md border border-gray-800 bg-gray-950 p-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Gauge className="size-3" />
                        {t("recentExtraction")}
                      </div>
                      <div className="mt-1 text-lg font-bold text-gray-100">{latestExtraction}</div>
                    </div>
                    <div className="rounded-md border border-gray-800 bg-gray-950 p-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <CalendarDays className="size-3" />
                        {t("recentRecord")}
                      </div>
                      <div className="mt-1 text-lg font-bold text-gray-100">{latestDate}</div>
                    </div>
                  </div>

                  <span className="mt-5 text-sm font-medium text-blue-200 transition-colors group-hover:text-blue-100">
                    {t("viewRecords")}
                  </span>
                </CustomLink>
              );
            })}
          </section>
        ) : (
          <div className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-12 text-center text-sm text-gray-400">
            {t("empty")}
          </div>
        )}
      </div>
    </div>
  );
};
