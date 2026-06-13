# 배포 가이드 (Deployment Guide)

이 프로젝트(`vscoke-api`)는 **Github Actions**와 **수동 배포**가 혼합된 방식을 사용합니다.

## 1. 소스 코드 배포 (자동)

코드 변경 사항(`src/`, `package.json` 등)은 Git을 통해 배포합니다.

1. 변경 사항 커밋:
   ```bash
   git add .
   git commit -m "feat: 기능 추가"
   ```
2. 원격 저장소 푸시:
   ```bash
   git push origin main
   ```
3. **Github Action**이 자동으로 다음을 수행합니다:
   - 빌드 (`npm run build`)
   - 배포 (`~/projects/vscoke-api` 경로로 전송)
   - 서버 재시작 (`pm2 restart vscoke-api`)

## 2. 환경 변수 배포 (수동)

보안상 `.env` 파일은 Git에 포함되지 않으므로 수동으로 전송해야 합니다.

1. `.env` 파일 전송:

   ```bash
   tmx cp .env
   ```

   > 주: `tmx cp`는 기본적으로 `~/projects/vscoke-api` 경로로 전송합니다.

2. (환경 변수만 변경 시) 서버 재시작 필요:
   ```bash
   tmx run "pm2 restart vscoke-api --update-env"
   ```
   > 코드 배포와 함께라면 Github Action이 재시작해주므로 생략 가능합니다.

## 요약

| 변경 유형              | 배포 방법     | 비고                      |
| :--------------------- | :------------ | :------------------------ |
| **코드 (`src` 등)**    | `git push`    | Github Action이 자동 처리 |
| **환경 변수 (`.env`)** | `tmx cp .env` | 수동 전송 및 재시작 필요  |
