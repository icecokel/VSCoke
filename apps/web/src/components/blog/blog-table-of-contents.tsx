"use client";

import { ChevronDown, List } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createBlogOutline, type BlogOutlineItem } from "@/components/blog/blog-outline";
import { BLOG_SPEECH_CONTENT_ID } from "@/components/blog/blog-speech";
import { cn } from "@/lib/utils";

export const BlogTableOfContents = () => {
  const t = useTranslations("blog.detail");
  const [items, setItems] = useState<BlogOutlineItem[]>([]);
  const [activeId, setActiveId] = useState("");
  const mobileDetails = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const article = document.getElementById(BLOG_SPEECH_CONTENT_ID);
    const container = document.getElementById("main-scroll-container");
    if (!article || !container) return;

    const headings = Array.from(article.querySelectorAll<HTMLElement>("h2, h3"));
    const outline = createBlogOutline(
      headings.map(heading => ({
        text: heading.textContent ?? "",
        level: Number(heading.tagName.substring(1)),
      })),
    );
    headings.forEach((heading, index) => {
      heading.id = outline[index].id;
      heading.tabIndex = -1;
    });
    setItems(outline);

    let frame = 0;
    const updateActiveHeading = () => {
      const threshold = container.getBoundingClientRect().top + 100;
      let active: HTMLElement | undefined = headings[0];
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > threshold) break;
        active = heading;
      }
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 2) {
        active = headings.at(-1);
      }
      setActiveId(active?.id ?? "");
    };
    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateActiveHeading);
    };
    const restoreFragment = () => {
      // 렌더된 제목에서 ID를 만든 뒤 새로고침한 fragment 위치를 복원한다.
      try {
        const id = decodeURIComponent(window.location.hash.slice(1));
        const target = headings.find(heading => heading.id === id);
        target?.scrollIntoView({ block: "start" });
      } catch {
        // 잘못 인코딩된 외부 링크여도 글을 읽는 데 지장을 주지 않는다.
      }
      scheduleUpdate();
    };
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(article);
    observer.observe(container);
    container.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("hashchange", restoreFragment);
    restoreFragment();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      container.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("hashchange", restoreFragment);
    };
  }, []);

  const handleNavigate = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (mobileDetails.current) mobileDetails.current.open = false;
    document.getElementById(id)?.focus({ preventScroll: true });
    // 기본 fragment 이동을 유지하여 URL·뒤로가기·키보드 탐색을 함께 지원한다.
    setActiveId(id);
  };

  if (items.length < 2) return null;

  const links = (
    <ol className="space-y-1 border-l border-border">
      {items.map((item, index) => (
        <li key={item.id}>
          <a
            href={`#${encodeURIComponent(item.id)}`}
            aria-current={activeId === item.id ? "location" : undefined}
            onClick={event => handleNavigate(event, item.id)}
            className={cn(
              "-ml-px flex min-h-10 items-start gap-2 border-l-2 border-transparent py-2 pr-2 pl-3 text-sm leading-6 break-words transition-colors hover:text-foreground focus-visible:rounded-r-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              item.level === 3 && "pl-5",
              activeId === item.id
                ? "border-primary bg-muted/50 font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            <span
              aria-hidden="true"
              className="shrink-0 pt-0.5 font-mono text-[10px] text-muted-foreground"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{item.text}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <aside
      className="order-1 min-w-0 self-start @4xl/blog:sticky @4xl/blog:top-6 @4xl/blog:order-2"
      data-testid="blog-outline"
    >
      <details
        ref={mobileDetails}
        className="group rounded-lg border border-border bg-card @4xl/blog:hidden"
      >
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <List aria-hidden="true" className="size-4 text-muted-foreground" />
          {t("contents")}
          <span aria-hidden="true" className="ml-auto font-mono text-xs text-muted-foreground">
            {items.length}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <nav aria-label={t("contents")} className="max-h-72 overflow-y-auto px-4 pb-4">
          {links}
        </nav>
      </details>
      <nav
        aria-label={t("contents")}
        className="hidden @4xl/blog:block"
        data-testid="blog-outline-desktop"
      >
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-wide text-foreground">
          <List aria-hidden="true" className="size-4 text-muted-foreground" />
          {t("contents")}
        </div>
        <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto overscroll-contain pb-2">
          {links}
        </div>
        <a
          href="#blog-post-top"
          className="mt-5 inline-flex min-h-10 items-center rounded-md px-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("backToTop")}
        </a>
      </nav>
    </aside>
  );
};
