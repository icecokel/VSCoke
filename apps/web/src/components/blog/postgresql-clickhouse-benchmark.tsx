"use client";

import { Activity, Database, Info, Play, Square } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  benchmarkDatabaseNames,
  benchmarkMeasurements,
  benchmarkQueries,
  getBenchmarkComparison,
  getBenchmarkReplayProgress,
  getBenchmarkReplayScale,
  type BenchmarkMeasurement,
  type BenchmarkQuery,
} from "@/components/blog/postgresql-clickhouse-benchmark-data";

const databases = ["postgres", "clickhouse"] as const;
const databaseColors = {
  postgres: "text-primary",
  clickhouse: "text-yellow-100",
};
const databaseBars = {
  postgres: "bg-primary",
  clickhouse: "bg-yellow-100",
};

interface BenchmarkReplayProps {
  isReady: boolean;
  measurement: BenchmarkMeasurement;
}

const BenchmarkReplay = ({ measurement, isReady }: BenchmarkReplayProps) => {
  const t = useTranslations("blog.benchmark");
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const statusId = useId();
  const maximumMs = getBenchmarkComparison(measurement).maximumMs;
  const replayScale = getBenchmarkReplayScale(measurement);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setIsReducedMotion(preference.matches);
      if (preference.matches) {
        setIsPlaying(false);
        setElapsedMs(null);
        setHasPlayed(false);
      }
    };
    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!isPlaying || isReducedMotion) return;
    let frameId = 0;
    let startedAt: number | undefined;
    const duration = maximumMs * replayScale;
    const tick = (now: number) => {
      startedAt ??= now;
      const elapsed = Math.min(now - startedAt, duration);
      setElapsedMs(elapsed);
      if (elapsed < duration) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        setIsPlaying(false);
      }
    };
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [isPlaying, isReducedMotion, maximumMs, replayScale]);

  const toggleReplay = () => {
    if (!isReady) return;
    if (isPlaying) {
      setIsPlaying(false);
      setElapsedMs(null);
      setHasPlayed(false);
      return;
    }
    setHasPlayed(true);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsReducedMotion(true);
      setElapsedMs(null);
      return;
    }
    setElapsedMs(0);
    setIsPlaying(true);
  };

  return (
    <div className="border-t border-border bg-muted/20 p-4 sm:p-6" data-testid="benchmark-replay">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">{t("replayTitle")}</p>
        <Button
          type="button"
          variant="outline"
          onClick={toggleReplay}
          disabled={!isReady || isReducedMotion}
          aria-describedby={statusId}
          className="min-h-11 touch-manipulation"
        >
          {isReducedMotion ? (
            <Info aria-hidden="true" className="size-3.5" />
          ) : isPlaying ? (
            <Square aria-hidden="true" className="size-3.5" />
          ) : (
            <Play aria-hidden="true" className="size-3.5" />
          )}
          {isReducedMotion ? t("staticResults") : isPlaying ? t("stop") : t("replay")}
        </Button>
      </div>
      <div className="space-y-4" aria-hidden="true">
        {databases.map(database => {
          const progress = isReducedMotion
            ? 1
            : elapsedMs === null
              ? 0
              : getBenchmarkReplayProgress(elapsedMs, measurement[database], replayScale);
          const isComplete = progress >= 1;
          return (
            <div
              key={database}
              data-testid={`benchmark-replay-${database}`}
              data-complete={isComplete}
            >
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className={cn("font-mono font-semibold", databaseColors[database])}>
                  {benchmarkDatabaseNames[database]}
                </span>
                <span className="text-muted-foreground">
                  {isComplete
                    ? t("completeTrack")
                    : isPlaying
                      ? t("runningTrack")
                      : t("waitingTrack")}{" "}
                  · {measurement[database].toFixed(3)} {t("unit")}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full origin-left rounded-full", databaseBars[database])}
                  style={{ transform: `scaleX(${progress})` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-6 text-muted-foreground">
        {t("replayNote", { scale: replayScale })}
      </p>
      <p
        role="status"
        className="mt-1 text-xs leading-5 text-muted-foreground"
        data-testid="benchmark-replay-status"
        id={statusId}
      >
        {isReducedMotion
          ? t("reduced")
          : isPlaying
            ? t("playing")
            : hasPlayed
              ? t("complete")
              : t("ready")}
      </p>
    </div>
  );
};

interface BenchmarkTrendProps {
  isReady: boolean;
  onSelect: (index: number) => void;
  measurements: readonly BenchmarkMeasurement[];
  selectedIndex: number;
}

const BenchmarkTrend = ({
  measurements,
  selectedIndex,
  onSelect,
  isReady,
}: BenchmarkTrendProps) => {
  const t = useTranslations("blog.benchmark");
  const locale = useLocale();
  const id = useId();
  const max = Math.ceil(Math.max(...measurements.flatMap(row => [row.postgres, row.clickhouse])));
  const selected = measurements[selectedIndex];
  const select = (index: number) => {
    if (isReady) onSelect(Math.max(0, Math.min(measurements.length - 1, index)));
  };
  const x = (index: number) => 42 + index * 57;
  const y = (value: number) => 148 - (value / max) * 118;
  const number = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 0 });

  return (
    <figure className="border-t border-border p-4 sm:p-6" data-testid="benchmark-trend">
      <figcaption className="mb-2 text-sm font-semibold">{t("trendTitle")}</figcaption>
      <p className="mb-3 text-xs leading-6 text-muted-foreground">{t("trendHint")}</p>
      <svg
        data-testid="benchmark-trend-chart"
        viewBox="0 0 540 188"
        className="h-auto w-full cursor-pointer touch-manipulation rounded-lg text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
        role="slider"
        tabIndex={isReady ? 0 : -1}
        aria-disabled={!isReady}
        aria-valuemin={0}
        aria-valuemax={measurements.length - 1}
        aria-valuenow={selectedIndex}
        aria-valuetext={t("rows", { count: selected.rows })}
        onClick={event => {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (bounds.width > 0)
            select(Math.round((((event.clientX - bounds.left) / bounds.width) * 540 - 42) / 57));
        }}
        onKeyDown={event => {
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? measurements.length - 1
                : ["ArrowLeft", "ArrowDown"].includes(event.key)
                  ? selectedIndex - 1
                  : ["ArrowRight", "ArrowUp"].includes(event.key)
                    ? selectedIndex + 1
                    : null;
          if (next !== null) {
            event.preventDefault();
            select(next);
          }
        }}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-note`}
      >
        <title id={`${id}-title`}>{t("trendLabel")}</title>
        {[0, 0.5, 1].map(fraction => (
          <g key={fraction}>
            <line
              x1="42"
              y1={y(max * fraction)}
              x2="510"
              y2={y(max * fraction)}
              stroke="currentColor"
              opacity="0.15"
            />
            <text
              x="34"
              y={y(max * fraction) + 4}
              textAnchor="end"
              fill="currentColor"
              fontSize="11"
            >
              {(max * fraction).toFixed(fraction === 0.5 ? 1 : 0)}
            </text>
          </g>
        ))}
        <text x="42" y="14" fill="currentColor" fontSize="10">
          {t("unit")}
        </text>
        <line
          x1={x(selectedIndex)}
          y1="24"
          x2={x(selectedIndex)}
          y2="148"
          stroke="currentColor"
          strokeDasharray="3 4"
          opacity="0.4"
        />
        {databases.map(database => (
          <g key={database} className={databaseColors[database]}>
            <polyline
              points={measurements.map((row, index) => `${x(index)},${y(row[database])}`).join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={database === "clickhouse" ? "5 3" : undefined}
            />
            {measurements.map((row, index) => (
              <circle
                key={row.rows}
                cx={x(index)}
                cy={y(row[database])}
                r={index === selectedIndex ? 5 : 2.5}
                fill="currentColor"
              >
                <title>{`${benchmarkDatabaseNames[database]} · ${t("rows", { count: row.rows })} · ${row[database].toFixed(3)} ${t("unit")}`}</title>
              </circle>
            ))}
          </g>
        ))}
        {measurements.map((row, index) => (
          <text
            key={row.rows}
            x={x(index)}
            y="173"
            textAnchor="middle"
            fill="currentColor"
            fontSize="10"
          >
            {number.format(row.rows)}
          </text>
        ))}
      </svg>
      <div
        className="my-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs leading-6"
        data-testid="benchmark-trend-selection"
        role="status"
        aria-atomic="true"
      >
        <p className="font-semibold">{t("rows", { count: selected.rows })}</p>
        <p className="flex flex-wrap gap-x-4 font-mono tabular-nums">
          {databases.map(database => (
            <span key={database} className={databaseColors[database]}>
              {benchmarkDatabaseNames[database]} {selected[database].toFixed(3)} {t("unit")}
            </span>
          ))}
        </p>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {databases.map(database => (
          <span
            key={database}
            className={cn("inline-flex items-center gap-2", databaseColors[database])}
          >
            <span
              aria-hidden="true"
              className={cn("w-5 border-t-2", database === "clickhouse" && "border-dashed")}
            />
            {benchmarkDatabaseNames[database]}
          </span>
        ))}
      </div>
      <p id={`${id}-note`} className="mt-2 text-xs leading-5 text-muted-foreground">
        {t("trendNote")}
      </p>
    </figure>
  );
};

export const PostgreSqlClickHouseBenchmark = () => {
  const t = useTranslations("blog.benchmark");
  const locale = useLocale();
  const id = useId();
  const [isReady, setIsReady] = useState(false);
  useEffect(() => setIsReady(true), []);
  const [query, setQuery] = useState<BenchmarkQuery>("group");
  const [rangeIndex, setRangeIndex] = useState(6);
  const measurements = benchmarkMeasurements[query];
  const measurement = measurements[rangeIndex];
  const comparison = getBenchmarkComparison(measurement);
  const compactNumber = new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 0,
  });
  const verdict =
    measurement.verdict === "pending"
      ? t("pending")
      : t("winner", { database: benchmarkDatabaseNames[measurement.verdict] });

  return (
    <section
      className="@container/benchmark my-8 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm"
      aria-labelledby={`${id}-heading`}
      data-testid="benchmark-explorer"
      data-ready={isReady}
      aria-busy={!isReady}
      data-blog-speech-exclude
      lang={locale}
    >
      <div className="border-b border-border bg-muted/30 p-4 sm:p-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
            {t("eyebrow")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
            <Activity aria-hidden="true" className="size-3" />
            {t("recorded")}
          </span>
        </div>
        <p id={`${id}-heading`} className="text-xl font-semibold tracking-tight">
          {t("title")}
        </p>
        <p className="mt-2 text-xs leading-6 text-muted-foreground" role="status">
          {isReady ? t("interactionHint") : t("loading")}
        </p>
      </div>

      <div className="p-4 sm:p-6">
        <div
          role="group"
          aria-label={t("queryLabel")}
          className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1"
        >
          {benchmarkQueries.map(key => (
            <Button
              key={key}
              type="button"
              variant="ghost"
              onClick={() => setQuery(key)}
              disabled={!isReady}
              aria-pressed={query === key}
              className={cn(
                "h-auto min-h-11 touch-manipulation whitespace-normal rounded-lg px-2 py-2 text-xs leading-5 @sm/benchmark:text-sm",
                query === key && "bg-background text-foreground shadow-sm hover:bg-background",
              )}
            >
              {t(key)}
            </Button>
          ))}
        </div>
        <p className="mt-3 min-h-10 text-xs leading-5 text-muted-foreground">
          {t(`${query}Description`)}
        </p>

        <div className="mt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <label htmlFor={`${id}-range`} className="text-sm text-muted-foreground">
              {t("rangeLabel")}
            </label>
            <output
              htmlFor={`${id}-range`}
              className="font-mono text-xl font-semibold tabular-nums"
              data-testid="benchmark-range-value"
            >
              {t("rows", { count: measurement.rows })}
            </output>
          </div>
          <input
            id={`${id}-range`}
            type="range"
            disabled={!isReady}
            min={0}
            max={measurements.length - 1}
            step={1}
            value={rangeIndex}
            aria-valuetext={t("rows", { count: measurement.rows })}
            aria-describedby={`${id}-range-hint`}
            onChange={event => setRangeIndex(Number(event.target.value))}
            className="mt-2 h-11 w-full cursor-pointer touch-pan-y appearance-none bg-transparent accent-primary disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted [&::-webkit-slider-thumb]:-mt-2.5 [&::-webkit-slider-thumb]:size-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-muted [&::-moz-range-thumb]:size-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-primary"
          />
          <div
            className="grid grid-cols-3 gap-2 @lg/benchmark:grid-cols-9"
            role="group"
            aria-label={t("rangeLabel")}
          >
            {measurements.map((row, index) => (
              <button
                key={row.rows}
                type="button"
                onClick={() => setRangeIndex(index)}
                disabled={!isReady}
                aria-label={t("rows", { count: row.rows })}
                aria-pressed={index === rangeIndex}
                className={cn(
                  "min-h-11 min-w-11 cursor-pointer touch-manipulation rounded-md border border-border px-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted active:bg-primary/15 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ring",
                  index === rangeIndex && "border-primary bg-primary/10 font-semibold text-primary",
                )}
              >
                {compactNumber.format(row.rows)}
              </button>
            ))}
          </div>
          <p id={`${id}-range-hint`} className="mt-2 text-[11px] leading-5 text-muted-foreground">
            {t("rangeHint")}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 @sm/benchmark:gap-3">
          {databases.map(database => (
            <div
              key={database}
              className="min-w-0 rounded-xl border border-border bg-background p-3 @sm/benchmark:p-4"
              data-testid={`benchmark-metric-${database}`}
            >
              <div
                className={cn(
                  "mb-2 flex items-center gap-1 text-xs font-medium @sm/benchmark:gap-2 @sm/benchmark:text-sm",
                  databaseColors[database],
                )}
              >
                <Database aria-hidden="true" className="size-4" />
                {benchmarkDatabaseNames[database]}
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span
                  className="font-mono text-2xl font-semibold tracking-tight tabular-nums @sm/benchmark:text-3xl"
                  data-testid={`benchmark-value-${database}`}
                >
                  {measurement[database].toFixed(3)}
                </span>
                <span className="text-sm text-muted-foreground">{t("unit")}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{t("median")}</p>
              <div aria-hidden="true" className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full origin-left rounded-full transition-transform duration-300 motion-reduce:transition-none",
                    databaseBars[database],
                  )}
                  style={{ transform: `scaleX(${measurement[database] / comparison.maximumMs})` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-4 rounded-xl border border-border bg-muted/30 p-4"
          role="status"
          aria-atomic="true"
          data-testid="benchmark-verdict"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">{verdict}</p>
            <span className="font-mono text-sm tabular-nums">
              {comparison.differenceMs.toFixed(3)} {t("unit")}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs leading-5 text-muted-foreground">
            <span>
              {comparison.durationRatio === null
                ? t("pendingNote")
                : t("ratio", { ratio: comparison.durationRatio.toFixed(2) })}
            </span>
            <span>{t("delta")}</span>
          </div>
        </div>
      </div>

      <BenchmarkReplay key={`${query}-${rangeIndex}`} measurement={measurement} isReady={isReady} />
      <BenchmarkTrend
        measurements={measurements}
        selectedIndex={rangeIndex}
        onSelect={setRangeIndex}
        isReady={isReady}
      />
      <div className="flex gap-2 border-t border-border bg-muted/20 px-4 py-3 sm:px-6">
        <Info aria-hidden="true" className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
        <p className="text-[11px] leading-5 text-muted-foreground">{t("scope")}</p>
      </div>
    </section>
  );
};
