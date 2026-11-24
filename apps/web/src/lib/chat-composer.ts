// 메인·이력서 채팅 입력창이 함께 쓰는 질문 길이와 Enter 전송 규칙.
// 길이 한도는 API ResumeRagChatRequestDto의 @Length(2, 1000)과 같아야 한다.
export const CHAT_QUESTION_MIN_LENGTH = 2;
export const CHAT_QUESTION_MAX_LENGTH = 1000;

// 이 길이를 넘기면 남은 글자 수를 보여준다.
export const CHAT_QUESTION_COUNTER_THRESHOLD = 800;

export const getChatQuestionLength = (question: string): number => question.trim().length;

export const isChatQuestionTooLong = (question: string): boolean =>
  getChatQuestionLength(question) > CHAT_QUESTION_MAX_LENGTH;

export const isChatQuestionSendable = (question: string): boolean => {
  const length = getChatQuestionLength(question);

  return length >= CHAT_QUESTION_MIN_LENGTH && length <= CHAT_QUESTION_MAX_LENGTH;
};

type ChatComposerKeyInput = {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
  keyCode: number;
};

// "submit": 기본 동작을 막고 전송한다.
// "composing": IME 조합을 확정하는 Enter라 기본 동작만 막고 전송하지 않는다.
// null: Shift+Enter 줄바꿈 등 기본 동작을 그대로 둔다.
export type ChatComposerKeyAction = "submit" | "composing" | null;

export const getChatComposerKeyAction = ({
  key,
  shiftKey,
  isComposing,
  keyCode,
}: ChatComposerKeyInput): ChatComposerKeyAction => {
  if (key !== "Enter" || shiftKey) return null;

  // Safari는 조합 확정 Enter에서 isComposing을 먼저 false로 바꾼다. keyCode 229로 함께 거른다.
  if (isComposing || keyCode === 229) return "composing";

  return "submit";
};
