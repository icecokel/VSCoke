export type EspressoUnit = 'g' | 'sec' | 'celsius' | 'bar';

export type EspressoMeasurement = {
  value?: number;
  min?: number;
  max?: number;
  unit: EspressoUnit;
};

export type EspressoEquipment = {
  machine?: string;
  grinder?: string;
  basket?: string;
  dosingShaker?: string;
  tamper?: string;
};

export type EspressoRecipeParameters = {
  dose?: EspressoMeasurement;
  yield?: EspressoMeasurement;
  temperature?: EspressoMeasurement;
  preinfusion?: EspressoMeasurement;
  extractionTime?: EspressoMeasurement;
  targetExtractionTime?: EspressoMeasurement;
  pressure?: EspressoMeasurement;
  flow?: string;
  grind?: string;
};

export type EspressoResult = {
  extractionTime?: EspressoMeasurement;
  pressure?: EspressoMeasurement;
  taste?: string[];
  notes?: string[];
};

export type EspressoRoundAnalysis = {
  changes?: string[];
  notes?: string[];
  judgments?: string[];
  inferences?: string[];
  conclusions?: string[];
  plannedComparisons?: string[];
};

export type EspressoCurrentAnalysis = {
  conditions?: string[];
  suspectedIssues?: string[];
};

export type EspressoAdjustmentGuide = {
  condition: string;
  action: string;
};

export type EspressoMethodStep = {
  time: string;
  steps: string[];
};

export type EspressoNextTest = {
  targetRoundNumber?: number;
  goals: string[];
  recipe: EspressoRecipeParameters;
  method: EspressoMethodStep[];
  expectedResult: string[];
};

export type EspressoRoundRecord = {
  id: string;
  roundNumber: number;
  date?: string | null;
  recipe: EspressoRecipeParameters;
  result: EspressoResult;
  analysis?: EspressoRoundAnalysis;
  nextActions: string[];
};

export type EspressoLogRecord = {
  id: string;
  type: 'espresso-log';
  title: string;
  rounds: EspressoRoundRecord[];
  currentAnalysis?: EspressoCurrentAnalysis;
  adjustmentGuide?: EspressoAdjustmentGuide[];
  finalHypothesis?: string[];
  nextTest?: EspressoNextTest;
  nextDirection?: string[];
};

export type EspressoBeanRecord = {
  id: string;
  name: string;
  roaster?: string;
  goals: string[];
  defaultEquipment: EspressoEquipment;
  logs: EspressoLogRecord[];
};
