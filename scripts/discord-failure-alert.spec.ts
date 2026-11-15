import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { formatFailureAlert, sendFailureAlert } from "./discord-failure-alert.mjs";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const run = promisify(execFile);
const script = join(root, "scripts/discord-failure-alert.mjs");
const webhookUrl = "https://discord.com/api/webhooks/123456/fixture-webhook-token";
const runEnv = {
  GITHUB_WORKFLOW: "Production Chat Smoke",
  GITHUB_REF_NAME: "main",
  GITHUB_SHA: "1c9ae385e65987dd07b02c6a6b47c5f7776b3507",
  GITHUB_EVENT_NAME: "schedule",
  GITHUB_SERVER_URL: "https://github.com",
  GITHUB_REPOSITORY: "icecokel/VSCoke",
  GITHUB_RUN_ID: "987654321",
  GITHUB_RUN_ATTEMPT: "1",
};
const runUrl = "https://github.com/icecokel/VSCoke/actions/runs/987654321";

interface RecordedRequest {
  url: string;
  init: { method: string; headers: Record<string, string>; body: string };
}

const createFetch = (respond: () => Promise<{ ok: boolean; status: number }>) => {
  const requests: RecordedRequest[] = [];
  const fetchImpl = async (url: string, init: RecordedRequest["init"]) => {
    requests.push({ url, init });
    return respond();
  };
  return { fetchImpl, requests };
};

const collectLogs = () => {
  const lines: string[] = [];
  return { lines, log: (message: string) => lines.push(message) };
};

test("실패 알림은 workflow·브랜치·짧은 SHA·트리거·실행 URL만 담는다", () => {
  assert.equal(
    formatFailureAlert(runEnv),
    [
      "[VSCoke] Production Chat Smoke 실패",
      "- 브랜치·커밋: main @ 1c9ae38",
      "- 트리거: 정기 실행(schedule)",
      `- 실행: ${runUrl}`,
    ].join("\n"),
  );
  const manual = formatFailureAlert({
    ...runEnv,
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_RUN_ATTEMPT: "2",
    ALERT_NOTE: " 알림 확인용 강제 실패(force_failure) ",
  });
  assert.match(manual, /- 트리거: 수동 실행\(workflow_dispatch\)/);
  assert.match(manual, /- 실행: \S+ \(재실행 2회차\)/);
  assert.match(manual, /\n- 비고: 알림 확인용 강제 실패\(force_failure\)$/);
  assert.match(formatFailureAlert({ ...runEnv, GITHUB_EVENT_NAME: "push" }), /- 트리거: push\n/);
  assert.doesNotMatch(formatFailureAlert({ ...runEnv, ALERT_NOTE: "" }), /비고/);
  const long = formatFailureAlert({ ...runEnv, GITHUB_WORKFLOW: "w".repeat(3000) });
  assert.equal(long.length, 2000);
});

test("webhook Secret이 없거나 비어 있으면 요청 없이 건너뛴다", async () => {
  for (const value of [undefined, "", "  \n"]) {
    const { fetchImpl, requests } = createFetch(async () => ({ ok: true, status: 204 }));
    const { lines, log } = collectLogs();
    const result = await sendFailureAlert({
      env: { ...runEnv, DISCORD_WEBHOOK_URL: value },
      fetchImpl,
      log,
    });
    assert.deepEqual(result, { status: "skipped" });
    assert.equal(requests.length, 0);
    assert.deepEqual(lines, ["DISCORD_WEBHOOK_URL Secret이 없어 Discord 실패 알림을 건너뜁니다."]);
  }
});

test("실패 알림은 멘션과 링크 미리보기 없이 한 번만 전송한다", async () => {
  const { fetchImpl, requests } = createFetch(async () => ({ ok: true, status: 204 }));
  const { lines, log } = collectLogs();
  const result = await sendFailureAlert({
    env: { ...runEnv, GITHUB_REF_NAME: "@everyone", DISCORD_WEBHOOK_URL: `${webhookUrl}\n` },
    fetchImpl,
    log,
  });
  assert.deepEqual(result, { status: "sent" });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, webhookUrl);
  assert.equal(requests[0].init.method, "POST");
  assert.equal(requests[0].init.headers["content-type"], "application/json");
  const body = JSON.parse(requests[0].init.body) as Record<string, unknown>;
  assert.deepEqual(body.allowed_mentions, { parse: [] });
  assert.equal(body.flags, 4);
  assert.match(String(body.content), /- 브랜치·커밋: @everyone @ 1c9ae38/);
  assert.deepEqual(lines, ["Discord 실패 알림을 전송했습니다."]);
});

test("webhook 오류·형식 오류는 URL과 응답 본문을 노출하지 않고 실패로 보고한다", async () => {
  const cases = [
    {
      respond: async () => ({ ok: false, status: 404, text: async () => webhookUrl }),
      expected: "::error::Discord 실패 알림 전송 실패 (HTTP 404)",
      httpStatus: 404,
    },
    {
      respond: async () => {
        throw new TypeError(`fetch failed: ${webhookUrl}`, {
          cause: Object.assign(new Error(webhookUrl), { code: "ENOTFOUND" }),
        });
      },
      expected: "::error::Discord 실패 알림 요청 오류 (TypeError ENOTFOUND)",
    },
    {
      respond: async () => {
        throw new DOMException(`timeout ${webhookUrl}`, "TimeoutError");
      },
      expected: "::error::Discord 실패 알림 요청 오류 (TimeoutError)",
    },
  ];
  for (const { respond, expected, httpStatus } of cases) {
    const { fetchImpl, requests } = createFetch(respond);
    const { lines, log } = collectLogs();
    const result = await sendFailureAlert({
      env: { ...runEnv, DISCORD_WEBHOOK_URL: webhookUrl },
      fetchImpl,
      log,
    });
    assert.deepEqual(result, httpStatus ? { status: "failed", httpStatus } : { status: "failed" });
    assert.equal(requests.length, 1, "자동 재시도로 알림을 중복 전송하지 않는다");
    assert.deepEqual(lines, [expected]);
  }
  for (const invalid of ["http://discord.com/api/webhooks/1/fixture-token", "fixture-token"]) {
    const { fetchImpl, requests } = createFetch(async () => ({ ok: true, status: 204 }));
    const { lines, log } = collectLogs();
    const result = await sendFailureAlert({
      env: { ...runEnv, DISCORD_WEBHOOK_URL: invalid },
      fetchImpl,
      log,
    });
    assert.deepEqual(result, { status: "failed" });
    assert.equal(requests.length, 0);
    assert.equal(lines.length, 1);
    assert.doesNotMatch(lines[0], /fixture-token/);
  }
});

test("CLI는 Secret이 없으면 성공 종료하고 잘못된 Secret은 값 없이 실패 종료한다", async () => {
  const env = { ...process.env, ...runEnv, DISCORD_WEBHOOK_URL: "" };
  const skipped = await run(process.execPath, [script], { env });
  assert.equal(
    skipped.stdout,
    "DISCORD_WEBHOOK_URL Secret이 없어 Discord 실패 알림을 건너뜁니다.\n",
  );
  const invalid = "http://127.0.0.1:9/api/webhooks/1/fixture-cli-token";
  await assert.rejects(
    run(process.execPath, [script], { env: { ...env, DISCORD_WEBHOOK_URL: invalid } }),
    (error: { code?: number; stdout?: string; stderr?: string }) => {
      assert.equal(error.code, 1);
      assert.doesNotMatch(`${error.stdout}${error.stderr}`, /fixture-cli-token/);
      return true;
    },
  );
});

for (const [path, job] of [
  [".github/workflows/production-chat-smoke.yml", "smoke"],
  [".github/workflows/deploy-api.yml", "deploy"],
] as const) {
  test(`${path}는 ${job} job 실패 시 별도 hosted job에서 한 번만 알린다`, () => {
    const workflow = readFileSync(join(root, path), "utf8");
    const [main, notify] = workflow.split("\n  notify-failure:\n");
    assert.ok(notify, "notify-failure job이 필요하다");
    assert.match(notify, new RegExp(`^    needs: ${job}\\n    if: failure\\(\\)\\n`));
    assert.match(notify, /\n    runs-on: ubuntu-latest\n/);
    assert.match(notify, /sparse-checkout: scripts\/discord-failure-alert\.mjs\n/);
    assert.match(
      notify,
      /- name: Send Discord failure alert\n        env:\n          DISCORD_WEBHOOK_URL: \$\{\{ secrets\.DISCORD_WEBHOOK_URL \}\}\n/,
    );
    assert.match(notify, /\n        run: node scripts\/discord-failure-alert\.mjs\n$/);
    // Secret은 env로만 전달하고 run 명령·원래 job·self-hosted runner에는 노출하지 않는다.
    assert.equal(workflow.split("secrets.DISCORD_WEBHOOK_URL").length, 2);
    assert.doesNotMatch(workflow, /echo[^\n]*DISCORD_WEBHOOK_URL/);
    assert.doesNotMatch(main, /DISCORD_WEBHOOK_URL|discord-failure-alert/);
    assert.doesNotMatch(notify, /\n  \S/, "notify-failure가 마지막 job이어야 한다");
  });
}

test("강제 실패 입력은 수동 실행에서만 smoke 전에 실패하고 알림에 표시된다", () => {
  const workflow = readFileSync(join(root, ".github/workflows/production-chat-smoke.yml"), "utf8");
  assert.match(
    workflow,
    /  workflow_dispatch:\n    inputs:\n      force_failure:\n[^]*?type: boolean\n        default: false\n/,
  );
  assert.match(
    workflow,
    /    steps:\n      - name: Fail on purpose for alert check\n        if: inputs\.force_failure\n/,
  );
  assert.match(
    workflow,
    /ALERT_NOTE: \$\{\{ inputs\.force_failure && '알림 확인용 강제 실패\(force_failure\)' \|\| '' \}\}/,
  );
});
