# API 배포 가이드

이 프로젝트(`apps/api`)는 GitHub Actions로 Termux 서버에 배포하고, 환경 변수는 서버에서 수동 관리합니다.

전체 monorepo 배포/환경 변수 기준은 [Deployment and Environment Plan](../../docs/deployment-and-env.md)을 우선합니다.

## 1. 소스 코드 배포 (자동)

코드 변경 사항(`apps/api/src/`, `apps/api/package.json` 등)은 Git을 통해 배포합니다.

1. 변경 사항 커밋:
   ```bash
   git add .
   git commit -m "feat(api):기능 추가"
   ```
2. 원격 저장소 푸시:
   ```bash
   git push origin main
   ```
3. GitHub Actions가 자동으로 다음을 수행합니다:
   - 빌드 (`pnpm --filter @vscoke/api build`)
   - 배포 (`~/projects/vscoke-api` 경로로 전송)
   - 서버 재기동 (`pm2 delete vscoke-api || true` 후 `pm2 start ... --name vscoke-api`)

## 2. 환경 변수 배포 (수동)

보안상 `.env` 파일은 Git에 포함되지 않으므로 수동으로 전송해야 합니다. 운영 `.env`는 Termux 서버의 `~/projects/vscoke-api/.env` 기준입니다.

로컬 또는 운영 환경을 새로 만들 때는 `apps/api/.env.example`을 복사한 뒤 실제 값으로 채웁니다.

1. `.env` 파일 전송:

   ```bash
   tmx cp .env
   ```

   > 주: `tmx cp`는 기본적으로 `~/projects/vscoke-api` 경로로 전송합니다.

2. (환경 변수만 변경 시) 서버 재시작 필요:
   ```bash
   tmx run "pm2 restart vscoke-api --update-env"
   ```
   > 코드 배포와 함께라면 GitHub Actions가 재시작해주므로 생략 가능합니다.

## 요약

| 변경 유형                    | 배포 방법     | 비고                       |
| :--------------------------- | :------------ | :------------------------- |
| **코드 (`apps/api/src` 등)** | `git push`    | GitHub Actions가 자동 처리 |
| **환경 변수 (`.env`)**       | `tmx cp .env` | 수동 전송 및 재시작 필요   |

## 운영 전 확인할 항목

- GitHub Actions secrets: `TERMUX_HOST`, `TERMUX_USER`, `TERMUX_KEY`
- Termux runtime: Node.js 20 이상, pnpm 9.12.0, PM2, PostgreSQL 접근성
- Cloudflare Tunnel: API 도메인이 Termux API 포트로 라우팅되는지 확인
- API runtime env: `NODE_ENV=production`, `DB_SYNCHRONIZE=false`, `GOOGLE_CLIENT_ID`, DB 접속 정보
- Web 연동: Vercel의 `NEXT_PUBLIC_API_URL`이 API 공개 도메인을 가리키는지 확인

## PM2 복구 절차

배포 workflow는 `vscoke-api` 프로세스를 삭제한 뒤 새로 시작합니다. 첫 운영 배포가 성공하면 Termux 서버에서 현재 PM2 목록을 저장합니다.

```bash
tmx run "pm2 status"
tmx run "pm2 save"
```

기기 재부팅 후 자동 복구가 필요하면 Termux:Boot 또는 기존 부팅 자동화에서 아래 흐름을 실행하도록 구성합니다.

```bash
pm2 resurrect
pm2 status
```

Cloudflare Tunnel도 재부팅 후 API 도메인을 다시 Termux API 포트로 연결해야 합니다. Tunnel이 별도 서비스로 관리되는지, Termux boot script에서 같이 시작되는지 운영 환경에서 확인합니다.
