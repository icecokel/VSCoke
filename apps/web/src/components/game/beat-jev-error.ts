import { ApiError } from "@/lib/api-client";

export const resolveBeatJevErrorMessage = (
  error: unknown,
  t: (key: "requestFailed" | "rateLimited") => string,
): string => {
  // 서버 메시지는 한국어 고정이라 로케일별 문구는 클라이언트가 결정한다.
  if (error instanceof ApiError && error.status === 429) return t("rateLimited");
  return error instanceof Error && error.message ? error.message : t("requestFailed");
};
