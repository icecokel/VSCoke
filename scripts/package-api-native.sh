#!/usr/bin/env bash
set -euo pipefail
umask 077

# Docker runtime과 같은 고정 lockfile로 별도 production 의존성 트리를 만든다.
release="${1:?릴리스 출력 경로가 필요합니다.}"
test ! -e "$release"
test -f apps/api/dist/src/main.js
mkdir -p "$release/apps" "$release/bin" "$release/scripts" "$release/docs"
mkdir -p "$release/apps/api"
cp package.json pnpm-lock.yaml pnpm-workspace.yaml "$release/"
cp apps/api/package.json "$release/apps/api/"
pnpm --dir "$release" --filter @vscoke/api install --prod --frozen-lockfile --ignore-scripts
cp -R apps/api/dist "$release/apps/api/"
cp "$(command -v node)" "$release/bin/node"
cp scripts/api-deploy-env.mjs scripts/check-api-health.mjs scripts/api-health-checker.mjs "$release/scripts/"
mkdir -p "$release/apps/web/src/constants" "$release/apps/web/messages"
cp apps/web/src/constants/resume-data.json "$release/apps/web/src/constants/"
cp apps/web/messages/{ko-KR,en-US,ja-JP}.json "$release/apps/web/messages/"
cp -R apps/web/resume-detail "$release/apps/web/"
cp docs/public-{site-guide,resume-experience,resume-raw-data}.md "$release/docs/"
test -f "$release/apps/api/dist/scripts/import-resume-source-items.js"
test -f "$release/apps/api/dist/scripts/index-resume-vectors.js"
"$release/bin/node" -e '
  const {createRequire} = require("node:module");
  const api = createRequire(process.argv[1]);
  const transformers = createRequire(api.resolve("@huggingface/transformers"));
  transformers("onnxruntime-node");
' "$release/apps/api/package.json"
