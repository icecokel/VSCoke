type MainChatKeyInput = {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
};

export const shouldSubmitMainChatKey = ({
  key,
  shiftKey,
  isComposing,
}: MainChatKeyInput): boolean => key === "Enter" && !shiftKey && !isComposing;
