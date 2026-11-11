import type { components } from "@/types/api";

export const espressoBeans: components["schemas"]["EspressoBeanResponseDto"][] = [
  {
    id: "bean-fritz-jal-doeeo-gasina",
    name: "프릳츠 잘 되어 가시나",
    roaster: "프릳츠",
    goals: ["단맛", "밸런스", "긴 달콤한 후미", "깔끔한 에스프레소"],
    defaultEquipment: {
      basket: "IMS 20g",
      tamper: "정압 템퍼",
      machine: "CRM 3605 PWM 2버전",
      dosingShaker: "사용",
    },
    logs: [
      {
        id: "log-home-espresso-001",
        title: "홈카페 에스프레소 추출 로그",
        currentAnalysis: {
          conditions: [
            "도징 20g",
            "추출량 38g",
            "온도 88도",
            "분쇄도 2.4",
            "유량 최대에서 4칸 내림",
            "추출시간 20초",
            "찌르는 산미 약간 감소",
          ],
          suspectedIssues: ["추출시간이 20초로 여전히 짧아 단맛 추출 부족 가능성"],
        },
        adjustmentGuide: [
          {
            condition: "여전히 20초 이하",
            action: "분쇄도 아주 조금만 가늘게",
          },
        ],
        finalHypothesis: ["채널링과 퍽 붕괴 가능성을 먼저 확인"],
        nextTest: {
          targetRoundNumber: 5,
          goals: ["산미 감소", "단맛 증가"],
          recipe: {
            dose: {
              unit: "g",
              value: 20,
            },
            grind: "2.4 기준에서 아주 조금만 가늘게 조정",
            yield: {
              unit: "g",
              value: 37,
            },
            temperature: {
              unit: "celsius",
              value: 92,
            },
            targetExtractionTime: {
              unit: "sec",
              min: 28,
              max: 34,
            },
          },
          method: [
            {
              time: "0~6초",
              steps: ["저유량", "퍽 적시기"],
            },
          ],
          expectedResult: ["산미 감소", "단맛 증가"],
        },
        nextDirection: ["추출시간을 늘리고 퍽 안정성을 먼저 확인"],
        type: "espresso-log",
        rounds: [
          {
            id: "round-001",
            roundNumber: 1,
            date: null,
            recipe: {
              dose: {
                unit: "g",
                value: 19.5,
              },
              yield: {
                unit: "g",
                value: 35,
              },
            },
            result: {
              taste: ["산미 강함"],
              extractionTime: {
                unit: "sec",
                min: 14,
                max: 15,
              },
            },
            analysis: {
              judgments: ["전형적인 저추출"],
            },
            nextActions: ["분쇄도 가늘게 조정"],
          },
          {
            id: "round-002",
            roundNumber: 2,
            date: null,
            recipe: {},
            result: {
              taste: ["산미가 더 강해짐"],
              pressure: {
                unit: "bar",
                value: 9,
              },
              extractionTime: {
                unit: "sec",
                value: 18,
              },
            },
            analysis: {
              notes: ["그라인더가 힘들어함"],
              judgments: ["채널링 가능성"],
            },
            nextActions: [],
          },
          {
            id: "round-003",
            roundNumber: 3,
            date: "2026-06-10",
            recipe: {
              dose: {
                unit: "g",
                value: 20,
              },
              yield: {
                unit: "g",
                value: 38,
              },
              temperature: {
                unit: "celsius",
                value: 88,
              },
            },
            result: {
              taste: ["찌르는 산미가 줄었다"],
            },
            analysis: {
              judgments: ["찌르는 산미 감소 방향 확인"],
            },
            nextActions: ["온도와 유량 유지"],
          },
          {
            id: "round-004",
            roundNumber: 4,
            date: "2026-06-11",
            recipe: {
              dose: {
                unit: "g",
                value: 20,
              },
              flow: "최대에서 4칸 내림",
              grind: "2.4",
              yield: {
                unit: "g",
                value: 38,
              },
              temperature: {
                unit: "celsius",
                value: 88,
              },
              extractionTime: {
                unit: "sec",
                value: 20,
              },
            },
            result: {
              taste: ["찌르는 산미가 약간 줄었다", "아직 산미가 가장 도드라짐"],
            },
            analysis: {
              judgments: ["산미를 더 줄이는 방향의 추가 조정이 필요"],
            },
            nextActions: ["추출시간을 늘리는 방향 확인"],
          },
        ],
      },
    ],
  },
  {
    id: "bean-momos-espresso-chocolat",
    name: "모모스 에스쇼콜라",
    roaster: "모모스커피",
    goals: ["다크초콜릿", "깔끔한 단맛", "크림 같은 질감", "바디"],
    defaultEquipment: {
      basket: "IMS 20g",
      tamper: "정압 템퍼",
      machine: "CRM 3605 PWM 2버전",
      dosingShaker: "사용",
    },
    logs: [],
  },
];

export const recipes: components["schemas"]["RecipeResponseDto"][] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "고추장 불고기",
    tags: ["저장용", "한식"],
    ingredients: ["돼지고기 1kg"],
    recipe: ["양념장 재료를 섞는다."],
    createdAt: "2026-06-16T12:00:00.000Z",
    updatedAt: "2026-06-16T12:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "닭볶음탕",
    tags: ["한식"],
    ingredients: ["닭 1마리"],
    recipe: ["닭을 씻어 핏물을 제거한다."],
    createdAt: "2026-06-16T12:00:00.000Z",
    updatedAt: "2026-06-16T12:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    name: "봄동 겉절이",
    tags: ["한식"],
    ingredients: ["봄동 1포기"],
    recipe: ["봄동을 먹기 좋은 크기로 자른다."],
    createdAt: "2026-06-16T12:00:00.000Z",
    updatedAt: "2026-06-16T12:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    name: "부타동",
    tags: ["일식"],
    ingredients: ["돼지고기 300g", "우동다시 1", "미림 1", "설탕 1"],
    recipe: ["양파를 얇게 슬라이스해서 충분히 볶는다.", "고기를 넣고 양념과 함께 볶는다."],
    createdAt: "2026-06-16T12:00:00.000Z",
    updatedAt: "2026-06-16T12:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    name: "세발나물무침",
    tags: ["한식", "반찬"],
    ingredients: ["세발나물"],
    recipe: ["재료를 가볍게 버무린다."],
    createdAt: "2026-06-16T12:00:00.000Z",
    updatedAt: "2026-06-16T12:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000006",
    name: "순두부 양념",
    tags: ["한식"],
    ingredients: ["다진 양파"],
    recipe: ["재료를 충분히 볶는다."],
    createdAt: "2026-06-16T12:00:00.000Z",
    updatedAt: "2026-06-16T12:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000007",
    name: "장각구이",
    tags: ["한식"],
    ingredients: ["장각 2"],
    recipe: ["장각을 염지한 뒤 오븐에서 굽는다."],
    createdAt: "2026-06-16T12:00:00.000Z",
    updatedAt: "2026-06-16T12:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000008",
    name: "참나물 무침",
    tags: ["한식", "반찬"],
    ingredients: ["참나물 1팩"],
    recipe: ["양념장에 가볍게 버무린다."],
    createdAt: "2026-06-16T12:00:00.000Z",
    updatedAt: "2026-06-16T12:00:00.000Z",
  },
];
