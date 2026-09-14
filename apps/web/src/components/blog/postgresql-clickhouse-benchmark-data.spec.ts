import assert from "node:assert/strict";
import test from "node:test";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import {
  BENCHMARK_REPLAY_SCALE,
  benchmarkMeasurements,
  benchmarkQueries,
  getBenchmarkComparison,
  getBenchmarkReplayProgress,
} from "./postgresql-clickhouse-benchmark-data";

const expectedRanges = [1, 10, 100, 1000, 10000, 30000, 100000, 300000, 1000000];

test("실측 데이터는 3개 조회 × 9개 범위와 양수 중앙값 54개를 제공한다", () => {
  assert.equal(benchmarkQueries.length, 3);
  for (const query of benchmarkQueries) {
    const measurements = benchmarkMeasurements[query];
    assert.deepEqual(
      measurements.map(row => row.rows),
      expectedRanges,
    );
    for (const row of measurements) {
      assert.ok(Number.isFinite(row.postgres) && row.postgres > 0);
      assert.ok(Number.isFinite(row.clickhouse) && row.clickhouse > 0);
      if (row.verdict !== "pending") {
        assert.equal(row.verdict, row.postgres < row.clickhouse ? "postgres" : "clickhouse");
      }
    }
  }
});

test("3만 건 그룹 집계는 중앙값이 달라도 판단 보류를 보존한다", () => {
  const measurement = benchmarkMeasurements.group[5];
  assert.deepEqual(measurement, {
    rows: 30000,
    postgres: 4.1,
    clickhouse: 3.928,
    verdict: "pending",
  });
  assert.equal(getBenchmarkComparison(measurement).durationRatio, null);
  assert.equal(getBenchmarkComparison(measurement).differenceMs.toFixed(3), "0.172");
});

test("조회별 전환 구간이 달라 하나의 임계값으로 판정하지 않는다", () => {
  assert.ok(benchmarkMeasurements.filter.every(row => row.verdict === "postgres"));
  assert.equal(benchmarkMeasurements.group[4].verdict, "postgres");
  assert.equal(benchmarkMeasurements.group[6].verdict, "clickhouse");
  assert.equal(benchmarkMeasurements.join[2].verdict, "postgres");
  assert.equal(benchmarkMeasurements.join[3].verdict, "clickhouse");
});

test("100만 건 그룹 집계의 배율과 절대 차이를 함께 계산한다", () => {
  const comparison = getBenchmarkComparison(benchmarkMeasurements.group[8]);
  assert.equal(comparison.durationRatio?.toFixed(2), "4.78");
  assert.equal(comparison.differenceMs.toFixed(3), "28.125");
});

test("재생은 모든 조건에 같은 시간 배율을 사용하고 범위를 벗어나지 않는다", () => {
  assert.equal(BENCHMARK_REPLAY_SCALE, 50);
  for (const query of benchmarkQueries) {
    for (const row of benchmarkMeasurements[query]) {
      for (const milliseconds of [row.postgres, row.clickhouse]) {
        const duration = milliseconds * BENCHMARK_REPLAY_SCALE;
        assert.equal(getBenchmarkReplayProgress(-1, milliseconds), 0);
        assert.equal(getBenchmarkReplayProgress(0, milliseconds), 0);
        assert.equal(getBenchmarkReplayProgress(duration / 2, milliseconds), 0.5);
        assert.equal(getBenchmarkReplayProgress(duration, milliseconds), 1);
        assert.equal(getBenchmarkReplayProgress(duration * 2, milliseconds), 1);
      }
    }
  }
  assert.equal(getBenchmarkReplayProgress(Number.NaN, 1), 0);
  assert.equal(getBenchmarkReplayProgress(1, 0), 1);
});

test("새 글은 공개 목록에서 제외하고 명시적 초안 조회에서만 제공한다", () => {
  const slug = "dev/postgresql-clickhouse-comparison";
  assert.equal(getPostBySlug(slug)?.published, false);
  assert.ok(!getAllPosts().some(post => post.slug === slug));
  assert.ok(getAllPosts(true).some(post => post.slug === slug));
});
