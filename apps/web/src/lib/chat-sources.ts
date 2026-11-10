import { resumePath } from "@/features/resume/lib/resume-selection";

export interface ChatSourceIdentity {
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

export const getChatSourceLink = (
  source: ChatSourceIdentity,
  resumeKey?: string,
): ChatSourceLink | undefined => {
  if (source.publicUrl !== undefined) {
    return typeof source.publicUrl === "string" && isSafePublicUrl(source.publicUrl)
      ? { kind: "public", href: source.publicUrl }
      : undefined;
  }
  const match = /^resume-detail\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(source.sourceKey);
  if (!match) return undefined;
  const path = `/resume/${match[1]}`;
  return { kind: "inferred", href: resumeKey === undefined ? path : resumePath(path, resumeKey) };
};
