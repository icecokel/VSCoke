import { resumePath } from "@/features/resume/lib/resume-selection";

export interface ChatSourceIdentity {
  title?: string;
  sourceKey: string;
  version?: string;
  sectionPath?: string;
  publicUrl?: unknown;
}

export interface ChatSourceGroup<Source extends ChatSourceIdentity> {
  source: Source;
  referenceNumbers: number[];
}

export type ChatSourceLink = { kind: "public" | "inferred"; href: string };

export const groupChatSources = <Source extends ChatSourceIdentity>(
  sources: readonly Source[],
): ChatSourceGroup<Source>[] => {
  const groups = new Map<string, ChatSourceGroup<Source>>();
  sources.forEach((source, index) => {
    const key = JSON.stringify([source.sourceKey, source.version, source.sectionPath]);
    const existing = groups.get(key);
    if (existing) existing.referenceNumbers.push(index + 1);
    else groups.set(key, { source, referenceNumbers: [index + 1] });
  });
  return [...groups.values()];
};

const isSafePublicUrl = (url: string): boolean => {
  if (
    url.includes("\\") ||
    Array.from(url).some(character => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    })
  )
    return false;
  if (url.startsWith("/")) return !url.startsWith("//");
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
};

// 사이트 안내(docs/public-site-guide.md)의 절 제목과 그 절이 설명하는 화면.
// 절 제목을 바꾸면 chat-sources.spec.ts가 알려준다.
export const SITE_GUIDE_SECTION_PATHS: Readonly<Record<string, string>> = {
  "README와 이력서": "/readme",
  블로그: "/blog/dashboard",
  게임: "/game",
  취미: "/hobby/espresso",
};

const SITE_GUIDE_SOURCE_KEY_PREFIX = "app:site-guide#";

// 제목과 절 이름이 같으면(사이트 안내 절 등) 한 번만 보여준다.
export const getChatSourceLabel = (source: ChatSourceIdentity): string =>
  [...new Set([source.title, source.sectionPath].filter(Boolean))].join(" · ") || source.sourceKey;

export const getChatSourceLink = (
  source: ChatSourceIdentity,
  resumeKey?: string,
): ChatSourceLink | undefined => {
  if (source.publicUrl !== undefined) {
    return typeof source.publicUrl === "string" && isSafePublicUrl(source.publicUrl)
      ? { kind: "public", href: source.publicUrl }
      : undefined;
  }
  if (source.sourceKey.startsWith(SITE_GUIDE_SOURCE_KEY_PREFIX) && source.sectionPath) {
    const path = SITE_GUIDE_SECTION_PATHS[source.sectionPath];
    return path ? { kind: "inferred", href: path } : undefined;
  }
  const match = /^resume-detail\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(source.sourceKey);
  if (!match) return undefined;
  const path = `/resume/${match[1]}`;
  return { kind: "inferred", href: resumeKey === undefined ? path : resumePath(path, resumeKey) };
};
