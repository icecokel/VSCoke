import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Discord 메시지 content 최대 길이. 넘으면 webhook이 400으로 거절한다.
const DISCORD_CONTENT_LIMIT = 2000;
// Discord message flag SUPPRESS_EMBEDS. 실행 링크 미리보기가 알림을 길게 만들지 않게 한다.
const SUPPRESS_EMBEDS = 1 << 2;
const requestTimeoutMs = 10_000;

const triggerLabels = {
  schedule: "정기 실행(schedule)",
  workflow_dispatch: "수동 실행(workflow_dispatch)",
  push: "push",
};

export const formatFailureAlert = env => {
  const workflow = env.GITHUB_WORKFLOW || "GitHub Actions";
  const ref = env.GITHUB_REF_NAME || "알 수 없음";
  const sha = env.GITHUB_SHA ? env.GITHUB_SHA.slice(0, 7) : "알 수 없음";
  const trigger = triggerLabels[env.GITHUB_EVENT_NAME] ?? (env.GITHUB_EVENT_NAME || "알 수 없음");
  const attempt = Number(env.GITHUB_RUN_ATTEMPT);
  const runUrl = `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`;
  const lines = [
    `[VSCoke] ${workflow} 실패`,
    `- 브랜치·커밋: ${ref} @ ${sha}`,
    `- 트리거: ${trigger}`,
    `- 실행: ${runUrl}${attempt > 1 ? ` (재실행 ${attempt}회차)` : ""}`,
  ];
  if (env.ALERT_NOTE?.trim()) lines.push(`- 비고: ${env.ALERT_NOTE.trim()}`);
  const content = lines.join("\n");
  return content.length > DISCORD_CONTENT_LIMIT
    ? `${content.slice(0, DISCORD_CONTENT_LIMIT - 1)}…`
    : content;
};

const isWebhookUrl = value => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

// webhook URL 자체가 비밀값이므로 로그와 오류에는 URL, 응답 본문, 예외 메시지를 남기지 않는다.
const describeRequestError = error => {
  const code = error?.cause?.code ?? error?.code;
  return [error?.name || "Error", typeof code === "string" ? code : undefined]
    .filter(Boolean)
    .join(" ");
};

export const sendFailureAlert = async ({
  env = process.env,
  fetchImpl = globalThis.fetch,
  log = message => process.stdout.write(`${message}\n`),
} = {}) => {
  const webhookUrl = env.DISCORD_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    log("DISCORD_WEBHOOK_URL Secret이 없어 Discord 실패 알림을 건너뜁니다.");
    return { status: "skipped" };
  }
  if (!isWebhookUrl(webhookUrl)) {
    log("::error::DISCORD_WEBHOOK_URL Secret이 https URL 형식이 아니어서 알림을 보내지 않습니다.");
    return { status: "failed" };
  }
  try {
    const response = await fetchImpl(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content: formatFailureAlert(env),
        // 브랜치명·workflow 이름에 @everyone 등이 있어도 멘션하지 않는다.
        allowed_mentions: { parse: [] },
        flags: SUPPRESS_EMBEDS,
      }),
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    if (!response.ok) {
      log(`::error::Discord 실패 알림 전송 실패 (HTTP ${response.status})`);
      return { status: "failed", httpStatus: response.status };
    }
    log("Discord 실패 알림을 전송했습니다.");
    return { status: "sent" };
  } catch (error) {
    log(`::error::Discord 실패 알림 요청 오류 (${describeRequestError(error)})`);
    return { status: "failed" };
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  // tooling 테스트의 tsx가 CJS로 변환하므로 top-level await를 쓰지 않는다.
  sendFailureAlert().then(result => {
    if (result.status === "failed") process.exitCode = 1;
  });
}
