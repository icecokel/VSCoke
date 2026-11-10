import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateTotalExperience } from "./total-experience";

const now = new Date(2026, 10, 10);

test("총 경력은 시작·종료 월을 포함하고 재직 중 경력은 현재 월까지 센다", () => {
  assert.deepEqual(
    calculateTotalExperience(
      [
        "2026.02 - 재직 중",
        "2023.05 - 2025.07 (2년 3개월)",
        "2021.07 - 2023.04 (1년 10개월)",
        "2020.08 - 2021.07 (1년)",
        "2017.08 - 2019.05 (1년 10개월)",
      ],
      now,
    ),
    // 2021.07은 두 회사 기간에 모두 포함되므로 한 번만 센다.
    { years: 7, months: 8 },
  );
  assert.deepEqual(calculateTotalExperience(["2026.02 - Present"], now), {
    years: 0,
    months: 10,
  });
});

test("겹치거나 이어지는 경력 기간은 한 번만 센다", () => {
  assert.deepEqual(calculateTotalExperience(["2020.01 - 2020.12", "2020.06 - 2021.03"], now), {
    years: 1,
    months: 3,
  });
  assert.deepEqual(calculateTotalExperience(["2020.01 - 2020.06", "2020.07 - 2020.12"], now), {
    years: 1,
    months: 0,
  });
});

test("해석할 수 없는 기간이 있거나 경력이 없으면 총 경력을 만들지 않는다", () => {
  assert.equal(calculateTotalExperience([], now), null);
  assert.equal(calculateTotalExperience(["2020.01 - 2020.12", "약 3년"], now), null);
  assert.equal(calculateTotalExperience(["2020.13 - 2021.01"], now), null);
  assert.equal(calculateTotalExperience(["2021.05 - 2020.01"], now), null);
});
