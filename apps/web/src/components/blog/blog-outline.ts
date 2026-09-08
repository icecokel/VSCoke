export interface BlogOutlineItem {
  id: string;
  text: string;
  level: number;
}

export const createBlogOutline = (
  headings: Array<{ text: string; level: number }>,
): BlogOutlineItem[] => {
  const usedIds = new Set<string>();

  return headings.map(({ text, level }) => {
    const normalizedText = text.replace(/\s+/g, " ").trim();
    const slug = normalizedText
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70);
    const baseId = `blog-section-${slug || "heading"}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
    usedIds.add(id);
    return { id, text: normalizedText, level };
  });
};
