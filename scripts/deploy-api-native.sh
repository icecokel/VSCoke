#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

bundle="${1:?빌드된 릴리스 경로가 필요합니다.}"
root="${API_DEPLOY_DIR:?API_DEPLOY_DIR가 필요합니다.}"
revision="${GITHUB_SHA:?GITHUB_SHA가 필요합니다.}"
[[ "$revision" =~ ^[a-f0-9]{40}$ ]]
[[ "${GITHUB_RUN_ID:-}" =~ ^[0-9]+$ ]]
[[ "${GITHUB_RUN_ATTEMPT:-}" =~ ^[0-9]+$ ]]
[[ "$root" = /* && "$bundle" = /* ]]
id="$revision-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT"
release="$root/releases/$id"
state="$root/.local/deploy-$id"
test -f "$root/.local/activate"
test -f "$root/api.env"
test -f "$root/.local/db.env"
# 수동 실행도 Actions 배포와 같은 호스트 잠금을 사용한다.
exec 9>"$root/.local/deploy.lock"
flock -n 9
previous="$(readlink -f "$root/current")"
[[ "$previous" = "$root/releases/"* ]]
test -x "$previous/bin/node"
test ! -e "$release"
test ! -e "$state"
mkdir "$state"

cp -p "$root/api.env" "$state/api.env"
printf '%s\n' "$previous" > "$state/previous-release"
printf '배포 후보: %s (복구 기록: %s)\n' "$id" "$state"
environmentApplied=false
promoted=false
finished=false
node="$(command -v node)"
switchRelease() {
  "$node" -e '
    const fs = require("node:fs");
    const [target, link] = process.argv.slice(1);
    fs.rmSync(link + ".next", {force: true});
    fs.symlinkSync(target, link + ".next");
    fs.renameSync(link + ".next", link);
  ' "$1" "$root/current"
}
health() {
  API_HEALTH_URL="$1" \
    API_ENDPOINT_CHECKS=/resume,/recipes,/espresso-history/beans \
    API_HEALTH_RETRIES="${API_HEALTH_RETRIES:-30}" \
    API_HEALTH_RETRY_DELAY_MS="${API_HEALTH_RETRY_DELAY_MS:-2000}" \
    "$node" "$2/scripts/check-api-health.mjs"
}
cleanup() {
  status=$?
  trap - EXIT INT TERM
  unset API_ENV_PRODUCTION
  if [[ "$finished" != true ]]; then
    # 이전 코드·환경을 복구한다. import/index의 DB 쓰기는 되돌리지 않는다.
    set +e
    rollbackStatus=0
    if [[ "$environmentApplied" = true ]]; then
      cp -p "$state/api.env" "$root/api.env.rollback" && mv -f "$root/api.env.rollback" "$root/api.env" || rollbackStatus=1
    fi
    if [[ "$promoted" = true ]]; then
      switchRelease "$previous" || rollbackStatus=1
      sudo -n /usr/bin/systemctl restart vscoke-api.service || rollbackStatus=1
      health "${API_LOCAL_HEALTH_URL:-http://127.0.0.1:3000/health}" "$previous" || rollbackStatus=1
    fi
    if [[ "$rollbackStatus" = 0 ]]; then
      echo "배포 실패: 이전 릴리스와 환경을 보존/복구했습니다." >&2
    else
      echo "배포 및 자동 복구 실패: current, api.env, systemd를 수동 점검하세요." >&2
    fi
    [[ "$status" != 0 ]] || status=1
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

mkdir -p "$root/releases" "$root/logs"
mkdir "$release"
cp -a "$bundle/." "$release/"
ln -s "$root/api.env" "$release/.env"
ln -s "$root/logs" "$release/logs"
test -x "$release/bin/node"
test -f "$release/apps/api/dist/src/main.js"
node="$release/bin/node"
cd "$release"
environmentApplied=true
"$node" scripts/api-deploy-env.mjs write-native
unset API_ENV_PRODUCTION
run() { "$node" scripts/api-deploy-env.mjs run "$node" "$@"; }

# 운영 migration은 기존 정책대로 별도 백업·검토 후 실행한다. 누락 상태의 배포를 차단한다.
run -e '
  const source = require("./apps/api/dist/src/data-source.js").default;
  (async () => {
    await source.initialize();
    try {
      if (await source.showMigrations()) throw new Error("미적용 migration: 백업 후 별도 적용이 필요합니다.");
    } finally { await source.destroy(); }
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
'
run -e 'process.env.RESUME_WORKSPACE_ROOT = ""; require("./apps/api/dist/scripts/import-resume-source-items.js")'
run -e '
  if (process.env.RAG_RETRIEVAL_MODE !== "keyword" && process.env.RAG_EMBEDDING_PROVIDER) {
    require("./apps/api/dist/scripts/index-resume-vectors.js");
  }
'
promoted=true
switchRelease "$release"
sudo -n /usr/bin/systemctl restart vscoke-api.service
health "${API_LOCAL_HEALTH_URL:-http://127.0.0.1:3000/health}" "$release"
if [[ "${API_VERIFY_PUBLIC:-false}" = true ]]; then
  health "${API_HEALTH_URL:-https://api.icecoke.kr/health}" "$release"
fi
finished=true
printf '배포 완료: %s (복구 기록: %s)\n' "$id" "$state"
