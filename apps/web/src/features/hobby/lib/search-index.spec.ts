import assert from "node:assert/strict";
import test from "node:test";
import { createTranslator } from "next-intl";
import enMessages from "../../../../messages/en-US.json";
import jaMessages from "../../../../messages/ja-JP.json";
import koMessages from "../../../../messages/ko-KR.json";
import type { EspressoBean } from "@/features/hobby/types/espresso";
import type { Recipe } from "@/features/hobby/types/recipe";
import { buildHobbySearchItems } from "./search-index";

const recipe: Recipe = {
  id: "recipe-1",
  name: "Test recipe",
  tags: [],
  ingredients: ["one", "two"],
  recipe: ["one", "two", "three"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const espressoBean: EspressoBean = {
  id: "bean-1",
  name: "Test bean",
  goals: [],
  defaultEquipment: {},
  logs: [],
};

test("취미 검색 설명은 요청 locale의 요약 문구를 사용한다", () => {
  const cases = [
    {
      locale: "ko-KR",
      messages: koMessages,
      expected: ["재료 2개 · 단계 3개", "원두 · 0라운드"],
    },
    {
      locale: "en-US",
      messages: enMessages,
      expected: ["2 ingredients · 3 steps", "Bean · 0 rounds"],
    },
    {
      locale: "ja-JP",
      messages: jaMessages,
      expected: ["材料2件 · 手順3件", "豆 · 0ラウンド"],
    },
  ] as const;

  for (const { locale, messages, expected } of cases) {
    const tRecipes = createTranslator({ locale, messages, namespace: "hobby.recipes" });
    const tEspresso = createTranslator({ locale, messages, namespace: "hobby.espresso" });
    const items = buildHobbySearchItems([recipe], [espressoBean], {
      recipeSummary: (ingredients, steps) => tRecipes("summary", { ingredients, steps }),
      espressoSummary: (roaster, rounds) =>
        tEspresso("searchSummary", {
          roaster: roaster ?? tEspresso("searchBeanFallback"),
          rounds,
        }),
    });

    assert.deepEqual(
      items.map(item => item.description),
      expected,
    );
  }
});
