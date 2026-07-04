type ApiErrorLike = Error & {
  name: "ApiError";
  status: number;
};

const isFetchNetworkError = (error: unknown): boolean =>
  error instanceof TypeError && error.message === "fetch failed";

const isApiErrorLike = (error: unknown): error is ApiErrorLike =>
  error instanceof Error &&
  error.name === "ApiError" &&
  typeof (error as { status?: unknown }).status === "number";

export const isRecoverableReadError = (error: unknown): boolean => {
  if (isApiErrorLike(error)) {
    return error.status === 404 || error.status === 530;
  }

  return isFetchNetworkError(error);
};

export const logRecoverableReadError = (scope: string, error: unknown) => {
  if (isApiErrorLike(error) && error.status === 404) {
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${scope}] API read fallback: ${message}`);
};
