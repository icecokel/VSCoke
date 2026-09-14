export type BenchmarkQuery = "filter" | "group" | "join";
export type BenchmarkVerdict = "postgres" | "clickhouse" | "pending";

export interface BenchmarkMeasurement {
  rows: number;
  postgres: number;
  clickhouse: number;
  verdict: BenchmarkVerdict;
}

export const benchmarkQueries: readonly BenchmarkQuery[] = ["filter", "group", "join"];

// 원문 중앙값과 판정을 보존한다. 중앙값의 대소만으로 판단 보류를 덮어쓰지 않는다.
export const benchmarkMeasurements: Record<BenchmarkQuery, readonly BenchmarkMeasurement[]> = {
  filter: [
    { rows: 1, postgres: 0.311, clickhouse: 2.619, verdict: "postgres" },
    { rows: 10, postgres: 0.33, clickhouse: 2.517, verdict: "postgres" },
    { rows: 100, postgres: 0.338, clickhouse: 2.673, verdict: "postgres" },
    { rows: 1000, postgres: 0.312, clickhouse: 2.559, verdict: "postgres" },
    { rows: 10000, postgres: 0.343, clickhouse: 2.902, verdict: "postgres" },
    { rows: 30000, postgres: 0.341, clickhouse: 2.799, verdict: "postgres" },
    { rows: 100000, postgres: 0.39, clickhouse: 3.356, verdict: "postgres" },
    { rows: 300000, postgres: 0.571, clickhouse: 4.826, verdict: "postgres" },
    { rows: 1000000, postgres: 0.764, clickhouse: 6.362, verdict: "postgres" },
  ],
  group: [
    { rows: 1, postgres: 0.384, clickhouse: 3.277, verdict: "postgres" },
    { rows: 10, postgres: 0.383, clickhouse: 3.365, verdict: "postgres" },
    { rows: 100, postgres: 0.414, clickhouse: 3.387, verdict: "postgres" },
    { rows: 1000, postgres: 0.598, clickhouse: 3.594, verdict: "postgres" },
    { rows: 10000, postgres: 1.966, clickhouse: 3.931, verdict: "postgres" },
    { rows: 30000, postgres: 4.1, clickhouse: 3.928, verdict: "pending" },
    { rows: 100000, postgres: 11.847, clickhouse: 5.416, verdict: "clickhouse" },
    { rows: 300000, postgres: 22.974, clickhouse: 6.153, verdict: "clickhouse" },
    { rows: 1000000, postgres: 35.568, clickhouse: 7.443, verdict: "clickhouse" },
  ],
  join: [
    { rows: 1, postgres: 0.426, clickhouse: 3.042, verdict: "postgres" },
    { rows: 10, postgres: 0.487, clickhouse: 3.184, verdict: "postgres" },
    { rows: 100, postgres: 0.616, clickhouse: 3.337, verdict: "postgres" },
    { rows: 1000, postgres: 6.412, clickhouse: 3.712, verdict: "clickhouse" },
    { rows: 10000, postgres: 7.427, clickhouse: 3.675, verdict: "clickhouse" },
    { rows: 30000, postgres: 9.556, clickhouse: 4.64, verdict: "clickhouse" },
    { rows: 100000, postgres: 15.496, clickhouse: 5.881, verdict: "clickhouse" },
    { rows: 300000, postgres: 26.023, clickhouse: 8.222, verdict: "clickhouse" },
    { rows: 1000000, postgres: 55.113, clickhouse: 15.833, verdict: "clickhouse" },
  ],
};

export const benchmarkDatabaseNames = {
  postgres: "PostgreSQL",
  clickhouse: "ClickHouse",
} as const;

export const BENCHMARK_REPLAY_SCALE = 50;

export const getBenchmarkComparison = (measurement: BenchmarkMeasurement) => {
  const fasterMs = Math.min(measurement.postgres, measurement.clickhouse);
  const slowerMs = Math.max(measurement.postgres, measurement.clickhouse);

  return {
    differenceMs: slowerMs - fasterMs,
    // 판단 보류 조건에는 배율로 우열을 암시하지 않는다.
    durationRatio: measurement.verdict === "pending" ? null : slowerMs / fasterMs,
    maximumMs: slowerMs,
  };
};

export const getBenchmarkReplayProgress = (elapsedMs: number, recordedMs: number): number => {
  if (!Number.isFinite(recordedMs) || recordedMs <= 0) return 1;
  if (!Number.isFinite(elapsedMs)) return 0;
  return Math.max(0, Math.min(1, elapsedMs / (recordedMs * BENCHMARK_REPLAY_SCALE)));
};
