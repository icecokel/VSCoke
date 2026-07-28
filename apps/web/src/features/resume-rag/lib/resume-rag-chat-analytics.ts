export type ResumeRagChatEntryPoint = "readme" | "resume_question";
export type ResumeRagSurface = "readme" | "resume_question";

export type ResumeRagChatKeyword =
  | "analytics"
  | "browser"
  | "game"
  | "design_system"
  | "performance"
  | "automation"
  | "testing_deployment"
  | "react_nextjs"
  | "frontend"
  | "api_state"
  | "healthcare"
  | "commerce"
  | "oprimed"
  | "role_fit"
  | "project"
  | "other";

export type ResumeRagChatFailureReason =
  | "origin_blocked"
  | "service_unavailable"
  | "rate_limited"
  | "contract"
  | "request"
  | "storage";

type ResumeRagChatQuestionLength = "short" | "medium" | "long";
type ResumeRagChatEvidence = "grounded" | "no_evidence";
type AnalyticsEventParameter = string | number;
type ResumeRagAnalyticsEvent = { event: string } & Record<string, AnalyticsEventParameter>;

type ResumeRagChatAnalyticsInput = {
  entryPoint: ResumeRagChatEntryPoint;
  locale: string;
  question: string;
};

type ResumeRagChatEventInput = Omit<ResumeRagChatAnalyticsInput, "question">;

type ResumeRagAnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (
    command: "event",
    eventName: string,
    eventParameters: Record<string, AnalyticsEventParameter>,
  ) => void;
};

const gtmIdPattern = /^GTM-[A-Z0-9]+$/i;

const keywordMatchers: ReadonlyArray<readonly [ResumeRagChatKeyword, RegExp]> = [
  ["analytics", /(ga4|gtm|google analytics|행동\s*분석|행동\s*이벤트|分析イベント)/iu],
  ["browser", /(safari|webkit|webview|브라우저|ブラウザ)/iu],
  ["game", /(game result|게임\s*결과|게임|ゲーム)/iu],
  ["design_system", /(design\s*token|design system|공통\s*ui|디자인\s*토큰|デザイン.*トークン)/iu],
  [
    "performance",
    /(performance|image optimization|transfer size|성능|이미지\s*최적화|전송량|パフォーマンス)/iu,
  ],
  ["automation", /(automation|자동화|自動化)/iu],
  ["testing_deployment", /(ci\/cd|testing|test|deployment|배포|테스트|デプロイ)/iu],
  ["react_nextjs", /(react|next\.?js)/iu],
  ["frontend", /(front[\s-]?end|프론트엔드|フロントエンド)/iu],
  ["api_state", /(api|state management|상태\s*관리|api\s*연동|状態管理)/iu],
  ["healthcare", /(healthcare|medical|의료|ヘルスケア|医療)/iu],
  ["commerce", /(commerce|커머스|コマース)/iu],
  ["oprimed", /oprimed/iu],
  ["role_fit", /(role fit|role|position|직무|적합성|포지션|職務|適性)/iu],
  ["project", /(project|프로젝트|プロジェクト)/iu],
];

const getQuestionLength = (question: string): ResumeRagChatQuestionLength => {
  if (question.length <= 40) return "short";
  if (question.length <= 100) return "medium";

  return "long";
};

const isGoogleTagManagerConfigured = () => {
  return gtmIdPattern.test(process.env.NEXT_PUBLIC_GTM_ID ?? "");
};

const trackResumeRagEvent = (analyticsEvent: ResumeRagAnalyticsEvent) => {
  if (typeof window === "undefined") return;

  const analyticsWindow = window as ResumeRagAnalyticsWindow;
  analyticsWindow.dataLayer ??= [];
  analyticsWindow.dataLayer.push(analyticsEvent);

  if (isGoogleTagManagerConfigured() || typeof analyticsWindow.gtag !== "function") {
    return;
  }

  const { event, ...eventParameters } = analyticsEvent;
  analyticsWindow.gtag("event", event, eventParameters);
};

const createChatEvent = (
  event: string,
  { entryPoint, locale, question }: ResumeRagChatAnalyticsInput,
): ResumeRagAnalyticsEvent => {
  return {
    event,
    chat_entry_point: entryPoint,
    chat_locale: locale,
    chat_keyword: getResumeRagChatKeyword(question),
    chat_question_length: getQuestionLength(question),
  };
};

export const getResumeRagChatKeyword = (question: string): ResumeRagChatKeyword => {
  return keywordMatchers.find(([, matcher]) => matcher.test(question))?.[0] ?? "other";
};

export const createResumeRagChatSubmittedEvent = (
  input: ResumeRagChatAnalyticsInput,
): ResumeRagAnalyticsEvent => {
  return createChatEvent("resume_rag_chat_submitted", input);
};

export const trackResumeRagPageViewed = ({
  locale,
  surface,
}: {
  locale: string;
  surface: ResumeRagSurface;
}) => {
  trackResumeRagEvent({
    event: surface === "readme" ? "resume_readme_viewed" : "resume_chat_page_viewed",
    resume_locale: locale,
  });
};

export const trackResumeRagChatComposerFocused = ({
  entryPoint,
  locale,
}: ResumeRagChatEventInput) => {
  trackResumeRagEvent({
    event: "resume_rag_chat_composer_focused",
    chat_entry_point: entryPoint,
    chat_locale: locale,
  });
};

export const trackResumeRagChatOpened = ({ entryPoint, locale }: ResumeRagChatEventInput) => {
  trackResumeRagEvent({
    event: "resume_rag_chat_opened",
    chat_entry_point: entryPoint,
    chat_locale: locale,
  });
};

export const trackResumeRagChatTopicExpanded = ({
  locale,
  topicIndex,
}: {
  locale: string;
  topicIndex: number;
}) => {
  trackResumeRagEvent({
    event: "resume_rag_chat_topic_expanded",
    chat_entry_point: "resume_question",
    chat_locale: locale,
    chat_topic_index: topicIndex,
  });
};

export const trackResumeRagChatSuggestionSelected = ({
  locale,
  topicIndex,
}: {
  locale: string;
  topicIndex: number;
}) => {
  trackResumeRagEvent({
    event: "resume_rag_chat_suggestion_selected",
    chat_entry_point: "resume_question",
    chat_locale: locale,
    chat_topic_index: topicIndex,
  });
};

export const trackResumeRagChatSubmitted = (input: ResumeRagChatAnalyticsInput) => {
  trackResumeRagEvent(createResumeRagChatSubmittedEvent(input));
};

export const trackResumeRagChatCompleted = ({
  grounded,
  sourceCount,
  ...input
}: ResumeRagChatAnalyticsInput & { grounded: boolean; sourceCount: number }) => {
  trackResumeRagEvent({
    ...createChatEvent("resume_rag_chat_completed", input),
    chat_evidence: grounded ? ("grounded" satisfies ResumeRagChatEvidence) : "no_evidence",
    chat_source_count: sourceCount,
  });
};

export const trackResumeRagChatFailed = ({
  failureReason,
  ...input
}: ResumeRagChatAnalyticsInput & { failureReason: ResumeRagChatFailureReason }) => {
  trackResumeRagEvent({
    ...createChatEvent("resume_rag_chat_failed", input),
    chat_failure_reason: failureReason,
  });
};

export const trackResumeRagChatAnswerViewed = ({ entryPoint, locale }: ResumeRagChatEventInput) => {
  trackResumeRagEvent({
    event: "resume_rag_chat_answer_viewed",
    chat_entry_point: entryPoint,
    chat_locale: locale,
  });
};
