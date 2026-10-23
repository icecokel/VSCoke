# syntax=docker/dockerfile:1.7
# 빌드 컨텍스트는 저장소 루트다: docker build --file apps/api/Dockerfile .
# 포함 파일은 같은 디렉터리의 Dockerfile.dockerignore 허용 목록으로 제한한다.
ARG NODE_VERSION=24.22.1
ARG PNPM_VERSION=9.12.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
ARG PNPM_VERSION
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare "pnpm@${PNPM_VERSION}" --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/

FROM base AS build
RUN --mount=type=cache,id=vscoke-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm --filter @vscoke/api install --frozen-lockfile --ignore-scripts
COPY apps/api/tsconfig.json apps/api/tsconfig.build.json apps/api/nest-cli.json apps/api/
COPY apps/api/src apps/api/src
COPY apps/api/scripts apps/api/scripts
RUN pnpm --filter @vscoke/api build && test -f apps/api/dist/src/main.js

FROM base AS runtime
ENV NODE_ENV=production
RUN --mount=type=cache,id=vscoke-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm --filter @vscoke/api install --prod --frozen-lockfile --ignore-scripts
COPY --from=build /app/apps/api/dist apps/api/dist
# 운영 secret 파싱·health 검사 도구. 컨테이너 진입점이 /app/.env를 읽어 자식 프로세스에 주입한다.
COPY scripts/api-deploy-env.mjs scripts/check-api-health.mjs scripts/api-health-checker.mjs scripts/
# 웹에 공개된 자료만 이미지에 포함한다. 개인 이력 작업공간은 복사하지 않는다.
COPY apps/web/src/constants/resume-data.json apps/web/src/constants/
COPY apps/web/messages/ko-KR.json apps/web/messages/en-US.json apps/web/messages/ja-JP.json apps/web/messages/
COPY apps/web/resume-detail apps/web/resume-detail
COPY docs/public-site-guide.md docs/public-resume-experience.md docs/public-resume-raw-data.md docs/
# logs는 호스트 bind mount, 임베딩 캐시는 named volume이며 둘 다 node 사용자가 쓴다.
RUN mkdir -p logs .cache/embeddings && chown -R node:node logs .cache
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then((res) => process.exit(res.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "scripts/api-deploy-env.mjs", "run", "node", "apps/api/dist/src/main.js"]
