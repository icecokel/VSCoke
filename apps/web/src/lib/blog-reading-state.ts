import { routing } from "@/i18n/routing";
import { parseHistoryUrl } from "@/lib/history-path";

const returnKey = "vscoke-blog-reading-return";
const positionPrefix = "vscoke-blog-reading:";

export const getBlogDocumentKey = (path: string): string | null => {
  const url = parseHistoryUrl(path);
  if (!url) return null;
  const pathname = url.pathname.replace(new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`), "");
  if (!/^\/blog\/(dev|journal)\/[^/]+$/.test(pathname)) return null;
  const resume = url.searchParams.get("resume");
  const query = resume ? `?${new URLSearchParams({ resume })}` : "";
  return `${pathname}${query}`;
};

export const requestBlogReadingRestore = (path: string): void => {
  try {
    const key = getBlogDocumentKey(path);
    if (key) sessionStorage.setItem(returnKey, key);
    else sessionStorage.removeItem(returnKey);
  } catch {
    // 저장소가 차단되면 기본 진입 위치를 사용한다.
  }
};

export const consumeBlogReadingRestore = (key: string | null): boolean => {
  try {
    const target = sessionStorage.getItem(returnKey);
    sessionStorage.removeItem(returnKey);
    return key !== null && target === key;
  } catch {
    return false;
  }
};

export const readBlogReadingProgress = (key: string): number => {
  try {
    const progress = Number(sessionStorage.getItem(`${positionPrefix}${key}`));
    return Number.isFinite(progress) && progress >= 0 && progress <= 1 ? progress : 0;
  } catch {
    return 0;
  }
};

export const saveBlogReadingProgress = (key: string, progress: number): void => {
  try {
    sessionStorage.setItem(`${positionPrefix}${key}`, String(progress));
  } catch {
    // 위치 저장 실패가 문서 탐색을 막지 않도록 한다.
  }
};
