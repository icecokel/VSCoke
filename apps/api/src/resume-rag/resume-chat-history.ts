export type ResumeChatHistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export const RESUME_CHAT_HISTORY_TURNS = 6;
export const RESUME_CHAT_HISTORY_CHARACTERS = 12_000;
export const RESUME_CHAT_STORED_TURNS = 50;
export const RESUME_CHAT_RETENTION_DAYS = 30;

export const buildResumeChatHistory = (
  turns: ReadonlyArray<{ question: string; answer: string }>,
): ResumeChatHistoryMessage[] => {
  const selected: ResumeChatHistoryMessage[][] = [];
  let remaining = RESUME_CHAT_HISTORY_CHARACTERS;
  for (const turn of turns.slice(-RESUME_CHAT_HISTORY_TURNS).reverse()) {
    const question = turn.question.slice(0, Math.min(1000, remaining));
    remaining -= question.length;
    const answer = turn.answer.slice(0, Math.min(4000, remaining));
    remaining -= answer.length;
    if (!question || !answer) break;
    selected.unshift([
      { role: 'user', content: question },
      { role: 'assistant', content: answer },
    ]);
    if (remaining === 0) break;
  }
  return selected.flat();
};

const resumeReferencePatterns = [
  /(그|해당|위|앞서|이전)\s*(프로젝트|경험|회사|역할|기술|업무|작업|제품|서비스|문제|성과|내용|사례)/,
  /(거기|그곳|그때|그걸|그거|그것|그쪽)/,
  /\b(that|those|previous|earlier|above)\s+(project|experience|company|role|technology|technologies|work|product|service|problem|result|results|achievement|case)\b/i,
  /\bthere\b/i,
  /(その|あの|前の|先ほどの)(プロジェクト|経験|会社|役割|技術|仕事|製品|サービス|問題|成果|事例)/,
  /(そこで|そこでは|その時|それ)/,
] as const;

export const shouldResolveResumeChatReference = (question: string): boolean =>
  resumeReferencePatterns.some((pattern) => pattern.test(question));
