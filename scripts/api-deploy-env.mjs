import { spawnSync } from "node:child_process";
import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

const validate = content => {
  if (!content?.trim()) throw new Error("API_ENV_PRODUCTION Secret이 필요합니다.");
  const env = parseEnv(content);
  if (process.env.GITHUB_ACTIONS === "true") {
    for (const value of Object.values(env).filter(Boolean)) {
      const escaped = value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
      process.stdout.write(`::add-mask::${escaped}\n`);
    }
  }
  for (const key of ["DB_HOST", "DB_USERNAME", "DB_PASSWORD", "DB_DATABASE", "GOOGLE_CLIENT_ID"]) {
    if (!env[key]?.trim()) throw new Error(`운영 환경변수가 필요합니다: ${key}`);
  }
  if (env.NODE_ENV !== "production" || env.DB_SYNCHRONIZE !== "false") {
    throw new Error("NODE_ENV=production, DB_SYNCHRONIZE=false가 필요합니다.");
  }
  if (env.ENABLE_DEV_AUTH_BYPASS === "true" || env.DEV_AUTH_TOKEN || env.LOCAL_TEST_AUTH_TOKEN) {
    throw new Error("운영 환경에 개발 인증 토큰 또는 우회를 설정할 수 없습니다.");
  }
  return env;
};

try {
  const [action, ...args] = process.argv.slice(2);
  if (action === "check" || action === "write") {
    const content = process.env.API_ENV_PRODUCTION;
    validate(content);
    if (action === "write") {
      if (!process.env.API_DEPLOY_DIR) throw new Error("API_DEPLOY_DIR가 필요합니다.");
      const target = join(process.env.API_DEPLOY_DIR, ".env");
      const temporary = `${target}.tmp-${process.pid}`;
      try {
        writeFileSync(temporary, content, { mode: 0o600, flag: "wx" });
        renameSync(temporary, target);
      } finally {
        rmSync(temporary, { force: true });
      }
    }
  } else if (action === "run" && args.length > 0) {
    const env = { ...process.env, ...validate(readFileSync(".env", "utf8")) };
    // 전체 Secret 묶음은 자식 프로세스에 전달하지 않는다.
    delete env.API_ENV_PRODUCTION;
    const child = spawnSync(args[0], args.slice(1), { env, stdio: "inherit" });
    if (child.error) throw new Error("운영 명령을 실행할 수 없습니다.");
    process.exitCode = child.status ?? 1;
  } else {
    throw new Error("사용법: api-deploy-env.mjs check | write | run <command> [args]");
  }
} catch (error) {
  // 파일/프로세스 예외에는 비밀값이 포함될 수 있으므로 검증 오류 외에는 원문을 남기지 않는다.
  const message = error instanceof Error && !error.code ? error.message : "운영 환경 적용 실패";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
