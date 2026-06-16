#!/bin/bash

# .env 파일이 존재하는지 확인
if [ -f .env ]; then
  # .env 파일에서 환경변수 로드 (주석 처리된 라인 제외)
  export $(grep -v '^#' .env | xargs)
else
  echo "Error: .env file not found."
  exit 1
fi

# 필수 환경변수 확인
if [ -z "$CLOUDFLARE_DB_HOST" ]; then
  echo "Error: CLOUDFLARE_DB_HOST is not set in .env file."
  echo "Please add CLOUDFLARE_DB_HOST=<your-db-hostname> to your .env file."
  exit 1
fi

if [ -z "$DB_PORT" ]; then
  echo "Warning: DB_PORT is not set in .env file. Defaulting to 5432."
  DB_PORT=5432
fi

echo "Starting Cloudflare Tunnel connection..."
echo "Host: $CLOUDFLARE_DB_HOST"
echo "Local Port: $DB_PORT"

# cloudflared 명령 실행
# 주의: 이 명령은 포그라운드에서 실행되어 터널을 유지합니다.
cloudflared access tcp --hostname $CLOUDFLARE_DB_HOST --url localhost:$DB_PORT
