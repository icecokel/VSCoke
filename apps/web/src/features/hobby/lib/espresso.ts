import type {
  EspressoBean,
  EspressoEquipment,
  EspressoMeasurement,
  EspressoRecipeParameters,
} from "@/features/hobby/types/espresso";

const unitLabelMap: Record<string, string> = {
  g: "g",
  sec: "초",
  celsius: "°C",
  bar: "bar",
};

const labelMap: Record<string, string> = {
  machine: "머신",
  grinder: "그라인더",
  basket: "바스켓",
  dosingShaker: "도징쉐이커",
  tamper: "템퍼",
  dose: "도징",
  yield: "추출량",
  temperature: "온도",
  preinfusion: "프리인퓨전",
  extractionTime: "추출시간",
  targetExtractionTime: "목표 시간",
  pressure: "압력",
  flow: "유량",
  grind: "분쇄도",
};

const normalizeSearchText = (value: string) => value.toLowerCase().normalize("NFKC");

export const formatMeasurement = (measurement: EspressoMeasurement): string => {
  const unit = unitLabelMap[measurement.unit] ?? measurement.unit;

  if (typeof measurement.value === "number") {
    return `${measurement.value}${unit}`;
  }

  if (typeof measurement.min === "number" && typeof measurement.max === "number") {
    return `${measurement.min}-${measurement.max}${unit}`;
  }

  if (typeof measurement.min === "number") {
    return `${measurement.min}${unit} 이상`;
  }

  if (typeof measurement.max === "number") {
    return `${measurement.max}${unit} 이하`;
  }

  return unit;
};

export const isMeasurement = (value: unknown): value is EspressoMeasurement => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return "unit" in value;
};

export const formatEspressoValue = (value: unknown): string => {
  if (value == null || value === "") {
    return "-";
  }

  if (isMeasurement(value)) {
    return formatMeasurement(value);
  }

  if (Array.isArray(value)) {
    return value.map(formatEspressoValue).join(", ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${formatEspressoLabel(key)} ${formatEspressoValue(item)}`)
      .join(", ");
  }

  return String(value);
};

export const formatEspressoLabel = (key: string): string => {
  return labelMap[key] ?? key;
};

export const espressoParamsToPairs = (
  value: EspressoRecipeParameters | EspressoEquipment | undefined,
): Array<{ label: string; value: string }> => {
  if (!value) {
    return [];
  }

  return Object.entries(value)
    .filter(([, item]) => item != null && item !== "")
    .map(([key, item]) => ({
      label: formatEspressoLabel(key),
      value: formatEspressoValue(item),
    }));
};

export const getEspressoSearchText = (bean: EspressoBean): string => {
  const values: string[] = [
    bean.name,
    bean.roaster ?? "",
    ...bean.goals,
    ...espressoParamsToPairs(bean.defaultEquipment).flatMap(pair => [pair.label, pair.value]),
  ];

  for (const log of bean.logs) {
    values.push(log.title);
    values.push(...(log.currentAnalysis?.conditions ?? []));
    values.push(...(log.currentAnalysis?.suspectedIssues ?? []));
    values.push(...(log.finalHypothesis ?? []));
    values.push(...(log.nextDirection ?? []));
    values.push(...(log.nextTest?.goals ?? []));
    values.push(...(log.nextTest?.expectedResult ?? []));

    for (const guide of log.adjustmentGuide ?? []) {
      values.push(guide.condition, guide.action);
    }

    for (const round of log.rounds) {
      values.push(`라운드 ${round.roundNumber}`);
      values.push(round.date ?? "");
      values.push(...espressoParamsToPairs(round.recipe).flatMap(pair => [pair.label, pair.value]));
      values.push(...espressoParamsToPairs(round.result).flatMap(pair => [pair.label, pair.value]));
      values.push(...(round.result.taste ?? []));
      values.push(...(round.result.notes ?? []));
      values.push(...(round.analysis?.changes ?? []));
      values.push(...(round.analysis?.notes ?? []));
      values.push(...(round.analysis?.judgments ?? []));
      values.push(...(round.analysis?.inferences ?? []));
      values.push(...(round.analysis?.conclusions ?? []));
      values.push(...(round.analysis?.plannedComparisons ?? []));
      values.push(...round.nextActions);
    }
  }

  return normalizeSearchText(values.join(" "));
};
