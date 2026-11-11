"use client";

import { useEffect, useRef } from "react";
import {
  consumeBlogReadingRestore,
  getBlogDocumentKey,
  readBlogReadingProgress,
  requestBlogReadingRestore,
  saveBlogReadingProgress,
} from "@/lib/blog-reading-state";

export const useBlogReadingPosition = (path: string): void => {
  const isInitialNavigation = useRef(true);

  useEffect(() => {
    const handlePopState = () => {
      requestBlogReadingRestore(`${window.location.pathname}${window.location.search}`);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const key = getBlogDocumentKey(path);
    const isReturn = consumeBlogReadingRestore(key);
    const isHistoryNavigation = performance
      .getEntriesByType("navigation")
      .some(entry => "type" in entry && entry.type === "back_forward");
    const shouldRestore = isReturn || (isInitialNavigation.current && isHistoryNavigation);
    isInitialNavigation.current = false;
    const container = document.getElementById("main-scroll-container");
    if (!key || !container) return;

    const navigationPath = `${window.location.pathname}${window.location.search}`;
    let progress = 0;
    let isReady = false;
    let entryId: string | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      const distance = container.scrollHeight - container.clientHeight;
      return distance > 0 ? Math.min(1, Math.max(0, container.scrollTop / distance)) : 0;
    };
    const recordEntry = () => {
      const state = window.history.state;
      entryId = state?.vscokeBlogReadingEntry;
      if (typeof entryId !== "string") {
        entryId = crypto.randomUUID();
        window.history.replaceState({ ...state, vscokeBlogReadingEntry: entryId }, "");
      }
    };
    const readEntryProgress = (state: { vscokeBlogReadingEntry?: unknown } | null): number => {
      const id = state?.vscokeBlogReadingEntry;
      return readBlogReadingProgress(typeof id === "string" ? `${key}:entry:${id}` : key);
    };
    const save = () => {
      clearTimeout(timer);
      timer = undefined;
      if (!isReady) return;
      saveBlogReadingProgress(key, progress);
      // popstate 시점에는 도착 이력이 활성화되어 있으므로 떠나는 이력 ID를 사용한다.
      if (entryId) saveBlogReadingProgress(`${key}:entry:${entryId}`, progress);
    };
    const handleScroll = () => {
      if (!isReady) return;
      progress = measure();
      recordEntry();
      timer ??= setTimeout(save, 150);
    };
    // Next의 컨테이너 스크롤 처리 뒤에 복원하고, hash 이동은 기존 목차에 맡긴다.
    const restore = (nextProgress: number) => {
      if (!window.location.hash) {
        container.scrollTop = nextProgress * (container.scrollHeight - container.clientHeight);
      }
      progress = measure();
      recordEntry();
      isReady = true;
    };
    let frame = requestAnimationFrame(() =>
      restore(shouldRestore ? readEntryProgress(window.history.state) : 0),
    );
    const handlePopState = (event: PopStateEvent) => {
      if (`${window.location.pathname}${window.location.search}` !== navigationPath) return;
      // 같은 문서의 해시 이력은 path가 바뀌지 않아 effect가 다시 실행되지 않는다.
      save();
      consumeBlogReadingRestore(key);
      isReady = false;
      cancelAnimationFrame(frame);
      const nextProgress = readEntryProgress(event.state);
      frame = requestAnimationFrame(() => restore(nextProgress));
    };
    const handleClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement)) return;
      const url = new URL(link.href);
      if (
        url.origin !== window.location.origin ||
        `${url.pathname}${url.search}` !== navigationPath ||
        !url.hash ||
        !isReady
      )
        return;
      progress = measure();
      recordEntry();
      save();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") save();
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    container.addEventListener("click", handleClick, true);
    window.addEventListener("pagehide", save);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      cancelAnimationFrame(frame);
      save();
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("click", handleClick, true);
      window.removeEventListener("pagehide", save);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [path]);
};
