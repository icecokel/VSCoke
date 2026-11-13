import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

export const apiDeployPaths = [
  "apps/api/**",
  "apps/web/src/constants/resume-data.json",
  "apps/web/messages/*.json",
  "apps/web/resume-detail/**",
  "docs/public-site-guide.md",
  "docs/public-resume-experience.md",
  "docs/public-resume-raw-data.md",
  "scripts/check-api-health.mjs",
  "scripts/api-health-checker.mjs",
  "scripts/api-deploy-env.mjs",
  "scripts/api-deploy-scope.mjs",
  "scripts/package-api-native.sh",
  "scripts/deploy-api-native.sh",
  ".nvmrc",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  ".github/workflows/deploy-api.yml",
];

// loader manifest와의 계약은 api-deploy-scope.spec.ts에서 검증한다.
export const resumeMessageKeys = ["profile", "resume"];
const isMessageFile = path => /^apps\/web\/messages\/[^/]+\.json$/.test(path);
const isDeployFile = path =>
  apiDeployPaths.some(pattern =>
    pattern.endsWith("/**")
      ? path.startsWith(pattern.slice(0, -2))
      : pattern === "apps/web/messages/*.json"
        ? isMessageFile(path)
        : path === pattern,
  );

export const decideApiDeployment = ({ changedFiles, messages = {} }) => {
  const relevantFiles = changedFiles.filter(isDeployFile);
  const apiFile = relevantFiles.find(path => !isMessageFile(path));
  if (apiFile) return { shouldDeploy: true, reason: `API 배포 대상 변경: ${apiFile}` };

  for (const path of relevantFiles) {
    try {
      const before = JSON.parse(messages[path]?.before);
      const after = JSON.parse(messages[path]?.after);
      if (
        [before, after].some(value => !value || typeof value !== "object" || Array.isArray(value))
      ) {
        throw new Error("메시지 JSON 객체가 필요합니다");
      }
      const key = resumeMessageKeys.find(
        key => !isDeepStrictEqual(before[key] ?? {}, after[key] ?? {}),
      );
      if (key) return { shouldDeploy: true, reason: `이력 원본 변경: ${path} (${key})` };
    } catch {
      return { shouldDeploy: true, reason: `메시지 비교 불가: ${path}` };
    }
  }
  return {
    shouldDeploy: false,
    reason: "API와 이력 원본 변경 없음 (UI 전용 변경은 API 배포 생략)",
  };
};

export const getApiDeployment = ({
  deployDir,
  before,
  after,
  eventName,
  cwd = process.cwd(),
  git = args =>
    execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }),
}) => {
  if (eventName === "workflow_dispatch") {
    return { shouldDeploy: true, reason: "workflow_dispatch 수동 배포" };
  }
  if (![before, after].every(sha => /^[a-f\d]{40}$/i.test(sha) && !/^0+$/.test(sha))) {
    return { shouldDeploy: true, reason: "push 이전 커밋/현재 커밋 없음: 안전하게 API 배포" };
  }
  let lastSuccessfulDeploy;
  try {
    lastSuccessfulDeploy = readFileSync(
      resolve(deployDir, ".last-successful-deploy"),
      "utf8",
    ).trim();
  } catch {
    return { shouldDeploy: true, reason: "성공 배포 기록 조회 불가: 안전하게 API 배포" };
  }
  if (!/^[a-f\d]{40}$/i.test(lastSuccessfulDeploy) || /^0+$/.test(lastSuccessfulDeploy)) {
    return { shouldDeploy: true, reason: "성공 배포 커밋 없음: 안전하게 API 배포" };
  }
  for (const [baseline, label] of [
    [before, "push 이전 커밋"],
    [lastSuccessfulDeploy, "성공 배포 커밋"],
  ]) {
    try {
      const changedFiles = git(["diff", "--name-only", "--no-renames", "-z", baseline, after, "--"])
        .split("\0")
        .filter(Boolean);
      const messages = {};
      for (const path of changedFiles.filter(isMessageFile)) {
        messages[path] = {
          before: git(["show", `${baseline}:${path}`]),
          after: git(["show", `${after}:${path}`]),
        };
      }
      const result = decideApiDeployment({ changedFiles, messages });
      if (result.shouldDeploy)
        return { ...result, reason: `${label} ${baseline} 기준: ${result.reason}` };
    } catch {
      return { shouldDeploy: true, reason: `${label} 차이·메시지 조회 불가: 안전하게 API 배포` };
    }
  }
  return {
    shouldDeploy: false,
    reason:
      "push 이전·성공 배포 커밋 모두 API와 이력 원본 변경 없음 (UI 전용 변경은 API 배포 생략)",
  };
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = getApiDeployment({
    deployDir: process.env.API_DEPLOY_DIR,
    before: process.env.API_DEPLOY_BEFORE,
    after: process.env.GITHUB_SHA,
    eventName: process.env.GITHUB_EVENT_NAME,
  });
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `should_deploy=${result.shouldDeploy}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `API 배포: ${result.shouldDeploy ? "필요" : "생략"}\n\n${result.reason}\n`,
    );
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
