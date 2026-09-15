import { devices, expect, test } from "@playwright/test";
import ko from "../../messages/ko-KR.json";
import {
  benchmarkMeasurements,
  benchmarkQueries,
} from "../../src/components/blog/postgresql-clickhouse-benchmark-data";
import { gotoWithRetry } from "./test-helpers";

const articlePath = "/ko-KR/blog/dev/postgresql-clickhouse-comparison";
const copy = ko.blog.benchmark;
const rowsLabel = (rows: number) =>
  copy.rows.replace("{count, number}", rows.toLocaleString("ko-KR"));

for (const width of [375, 390, 430, 844]) {
  test.describe(`블로그 터치 ${width}px`, () => {
    test.use({
      viewport: { width, height: width === 844 ? 390 : 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
      userAgent: devices["iPhone 13"].userAgent,
    });

    test("탭과 9개 구간을 터치하면 실측값과 선택 상태가 바뀐다", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await gotoWithRetry(page, articlePath);
      const explorer = page.getByTestId("benchmark-explorer");
      for (const query of benchmarkQueries) {
        const tab = explorer.getByRole("button", { name: copy[query], exact: true });
        await tab.tap();
        await expect(tab).toHaveAttribute("aria-pressed", "true");
        const ranges = explorer.getByRole("group", { name: copy.rangeLabel, exact: true });
        for (const row of benchmarkMeasurements[query]) {
          const button = ranges.getByRole("button", { name: rowsLabel(row.rows), exact: true });
          await button.tap();
          await expect(button).toHaveAttribute("aria-pressed", "true");
          await expect(page.getByTestId("benchmark-value-postgres")).toHaveText(
            row.postgres.toFixed(3),
          );
          await expect(page.getByTestId("benchmark-value-clickhouse")).toHaveText(
            row.clickhouse.toFixed(3),
          );
        }
      }
      expect(errors).toEqual([]);
    });

    test("그래프를 터치하면 해당 구간의 수치를 확인할 수 있다", async ({ page }) => {
      await gotoWithRetry(page, articlePath);
      const chart = page.getByTestId("benchmark-explorer").locator('svg[viewBox="0 0 540 188"]');
      const box = await chart.boundingBox();
      expect(box).not.toBeNull();
      await chart.tap({ position: { x: (box!.width * 498) / 540, y: (box!.height * 90) / 188 } });
      await expect(page.getByTestId("benchmark-range-value")).toHaveText(rowsLabel(1000000));
      await expect(page.getByTestId("benchmark-value-postgres")).toHaveText("35.568");
      await chart.tap({ position: { x: (box!.width * 42) / 540, y: (box!.height * 90) / 188 } });
      await expect(page.getByTestId("benchmark-range-value")).toHaveText(rowsLabel(1));
    });

    test("슬라이더 트랙을 터치해 양 끝 구간을 선택한다", async ({ page }) => {
      await gotoWithRetry(page, articlePath);
      const slider = page.getByRole("slider", { name: copy.rangeLabel, exact: true });
      await expect(slider).toBeEnabled();
      const box = await slider.boundingBox();
      expect(box).not.toBeNull();
      await slider.tap({ position: { x: 3, y: box!.height / 2 } });
      await expect(slider).toHaveValue("0");
      await expect(page.getByTestId("benchmark-value-postgres")).toHaveText("0.384");
      await slider.tap({ position: { x: box!.width - 3, y: box!.height / 2 } });
      await expect(slider).toHaveValue("8");
      await expect(page.getByTestId("benchmark-value-postgres")).toHaveText("35.568");
    });

    test("작은 구간도 실제 시간으로 재생되고 중지와 재시작이 동작한다", async ({ page }) => {
      await gotoWithRetry(page, articlePath);
      const explorer = page.getByTestId("benchmark-explorer");
      const ranges = explorer.getByRole("group", { name: copy.rangeLabel, exact: true });
      await ranges.getByRole("button", { name: rowsLabel(1), exact: true }).tap();
      const replay = page.getByTestId("benchmark-replay");
      const status = page.getByTestId("benchmark-replay-status");
      await expect(page.getByTestId("benchmark-replay-postgres")).toHaveAttribute(
        "data-complete",
        "false",
      );
      const started = Date.now();
      await replay.getByRole("button", { name: copy.replay, exact: true }).tap();
      await expect(status).toHaveText(copy.playing);
      await expect(status).toHaveText(copy.complete);
      expect(Date.now() - started).toBeGreaterThanOrEqual(1900);
      await expect(page.getByTestId("benchmark-replay-clickhouse")).toHaveAttribute(
        "data-complete",
        "true",
      );
      await replay.getByRole("button", { name: copy.replay, exact: true }).tap();
      await replay.getByRole("button", { name: copy.stop, exact: true }).tap();
      await expect(status).toHaveText(copy.ready);
      await expect(page.getByTestId("benchmark-replay-clickhouse")).toHaveAttribute(
        "data-complete",
        "false",
      );
      await replay.getByRole("button", { name: copy.replay, exact: true }).tap();
      await ranges.getByRole("button", { name: rowsLabel(30000), exact: true }).tap();
      await expect(status).toHaveText(copy.ready);
      await expect(page.getByTestId("benchmark-verdict")).toContainText(copy.pending);
    });

    test("터치 영역과 결과가 잘리지 않고 전체 기록도 펼칠 수 있다", async ({ page }, testInfo) => {
      await gotoWithRetry(page, articlePath);
      const explorer = page.getByTestId("benchmark-explorer");
      await expect(explorer).toHaveAttribute("data-ready", "true");
      for (const button of await explorer.getByRole("button").all()) {
        const box = await button.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);
      }
      const size = await explorer.evaluate(element => ({
        width: element.clientWidth,
        scroll: element.scrollWidth,
      }));
      expect(size.scroll).toBeLessThanOrEqual(size.width + 1);
      const records = page.getByTestId("benchmark-records");
      await records.locator("summary").tap();
      await expect(records).toHaveAttribute("open", "");
      await expect(page.getByTestId("benchmark-table-group").locator("tbody tr")).toHaveCount(9);
      await records.locator("summary").tap();
      await expect(records).not.toHaveAttribute("open", "");
      if (width === 390) {
        await explorer.getByRole("button", { name: copy.filter, exact: true }).tap();
        await page.screenshot({ path: testInfo.outputPath("iphone-controls.png") });
      }
    });

    test("동작 줄이기에서는 재생 불가 상태를 누르기 전에 알린다", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await gotoWithRetry(page, articlePath);
      const replay = page.getByTestId("benchmark-replay");
      await expect(replay.getByRole("button")).toBeDisabled();
      await expect(page.getByTestId("benchmark-replay-status")).toHaveText(copy.reduced);
    });
  });
}
