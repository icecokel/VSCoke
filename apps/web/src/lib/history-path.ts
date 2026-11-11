export const getHistoryPath = (path: string): string => {
  const withoutHash = path.split("#", 1)[0];
  const queryIndex = withoutHash.indexOf("?");
  if (queryIndex === -1) return withoutHash;

  const pathname = withoutHash.slice(0, queryIndex);
  const searchParams = new URLSearchParams(withoutHash.slice(queryIndex + 1));
  if (pathname === "/hobby/recipes") {
    searchParams.delete("q");
    searchParams.delete("recipe");
  }
  const resumeKeys = searchParams.getAll("resume");
  if (
    (pathname === "/readme" || pathname.startsWith("/resume/")) &&
    resumeKeys.length === 1 &&
    resumeKeys[0] === "pe"
  ) {
    searchParams.delete("resume");
  }

  const remainingQuery = searchParams.toString();
  return `${pathname}${remainingQuery ? `?${remainingQuery}` : ""}`;
};
