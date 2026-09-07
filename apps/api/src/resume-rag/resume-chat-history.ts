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
