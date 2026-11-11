import { parseHistoryUrl } from "./history-path";

interface HistoryTitleOptions {
  documentTitle?: string;
  navigationTitle?: string;
  documents?: ReadonlyArray<{ path: string; title: string }>;
}

export const getHistoryTitle = (
  path: string,
  t: (
    key: "readmeTitle" | "readmeFrontendTitle" | "readmeVariantTitle",
    values?: Record<string, string>,
  ) => string,
  options: HistoryTitleOptions = {},
): string => {
  const url = parseHistoryUrl(path);
  if (!url) return options.documentTitle || options.navigationTitle || "Home";
  const { pathname, searchParams } = url;
  if (pathname === "/readme") {
    const variant = searchParams.get("resume") ?? "pe";
    if (variant === "pe") return t("readmeTitle");
    if (variant === "fe") return t("readmeFrontendTitle");
    return t("readmeVariantTitle", { variant });
  }
  if (/^\/share\/[^/]+$/.test(pathname)) return "share";

  const slug = pathname.split("/").pop() || pathname;
  if (/^\/resume\/[^/]+$/.test(pathname) && slug !== "question" && slug !== "preview") {
    return options.documentTitle || slug;
  }
  const document = options.documents?.find(
    item => parseHistoryUrl(item.path)?.pathname === pathname,
  );
  return (
    document?.title ||
    options.documentTitle ||
    options.navigationTitle ||
    (pathname === "/" ? "Home" : slug)
  );
};
