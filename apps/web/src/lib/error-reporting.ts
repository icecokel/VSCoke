import { getApiBaseUrl } from "@/lib/constants";

type WebErrorSource = "browser" | "web-server";
type WebErrorKind = "runtime" | "rejection" | "react" | "api" | "server";

type WebErrorReport = {
  eventId?: string;
  source: WebErrorSource;
  kind: WebErrorKind;
  path: string;
  errorName: string;
  message: string;
  stack?: string;
  relatedRequestId?: string;
  statusCode?: number;
};

const truncate = (value: string, length: number): string => value.slice(0, length);

const pathOnly = (value: string): string => {
  try {
    return new URL(value, "https://vscoke.icecoke.kr").pathname.slice(0, 200);
  } catch {
    return "/";
  }
};

export const reportWebError = async (report: WebErrorReport): Promise<void> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/client-errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...report,
        eventId: report.eventId ?? crypto.randomUUID(),
        path: pathOnly(report.path),
        errorName: truncate(report.errorName, 100),
        message: truncate(report.message, 500),
        stack: report.stack ? truncate(report.stack, 4000) : undefined,
      }),
      keepalive: true,
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok && typeof window === "undefined") {
      console.error(`Web error report was rejected: HTTP ${response.status}`);
    }
  } catch {
    // 오류 보고 실패가 원래 사용자 흐름을 변경하거나 재귀 보고를 만들면 안 된다.
    if (typeof window === "undefined") {
      console.error("Web error report could not reach the API");
    }
  }
};

export const reportException = (
  kind: Exclude<WebErrorKind, "api">,
  error: unknown,
  path: string,
  source: WebErrorSource = "browser",
  eventId?: string,
): Promise<void> => {
  const exception = error instanceof Error ? error : new Error(String(error));

  return reportWebError({
    source,
    eventId,
    kind,
    path,
    errorName: exception.name,
    message: exception.message,
    stack: exception.stack,
  });
};
