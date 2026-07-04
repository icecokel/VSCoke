import { expect, test } from "@playwright/test";
import { isRecoverableReadError } from "../../src/services/api-read-error";

const createApiError = (status: number, message: string) =>
  Object.assign(new Error(message), { name: "ApiError", status });

test.describe("API 읽기 fallback 분류", () => {
  test("404, 530, fetch 네트워크 실패를 fallback 처리하고 API 500은 숨기지 않는다", () => {
    expect(isRecoverableReadError(createApiError(404, "not found"))).toBe(true);
    expect(isRecoverableReadError(createApiError(530, "server migration"))).toBe(true);
    expect(isRecoverableReadError(new TypeError("fetch failed"))).toBe(true);

    expect(isRecoverableReadError(createApiError(500, "server error"))).toBe(false);
    expect(isRecoverableReadError(new TypeError("Failed to parse URL"))).toBe(false);
    expect(isRecoverableReadError(new Error("unexpected"))).toBe(false);
  });
});
