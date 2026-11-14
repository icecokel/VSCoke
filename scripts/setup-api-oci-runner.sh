#!/usr/bin/env bash
set -euo pipefail
umask 077

# 인프라 관리자가 OCI 터미널에서 실행한다. API 데이터·터널은 변경하지 않는다.
test "$(uname -s)" = Linux
test "$(uname -m)" = aarch64
test "$(id -un)" = ubuntu
runnerDir=/home/ubuntu/actions-runner-vscoke-api
repository=https://github.com/icecokel/VSCoke
runnerName=vscoke-api-oci-01
mkdir -p "$runnerDir"
cd "$runnerDir"

if [[ -f .runner ]]; then
  # 다른 저장소의 기존 러너를 덮어쓰거나 재등록하지 않는다.
  python3 - <<'PY'
import json
with open('.runner', encoding='utf-8') as source:
    settings = json.load(source)
if settings.get('gitHubUrl', '').rstrip('/').lower() != 'https://github.com/icecokel/vscoke' or settings.get('agentName') != 'vscoke-api-oci-01':
    raise SystemExit('다른 러너가 등록된 경로입니다. 설치를 중단합니다.')
PY
else
  archive=actions-runner-linux-arm64-2.338.2.tar.gz
  curl --fail --location --retry 3 --output "$archive" \
    "https://github.com/actions/runner/releases/download/v2.338.2/$archive"
  printf '%s  %s\n' \
    670adb2f268fe21dcbb58b3db0e0aa9d5b3bddfe2c651481336e561ff86de945 "$archive" \
    | sha256sum --check --status
  tar -xzf "$archive"
  sudo ./bin/installdependencies.sh
  echo '등록 토큰 입력란에서 Mac 클립보드의 토큰을 붙여넣으세요. 토큰은 공유하지 마세요.'
  ./config.sh --url "$repository" --name "$runnerName" --labels vscoke-api,oci-01 --work _work </dev/tty
fi

# 검증한 단일 명령 권한만 설치한다. 파일 교체 전에 문법을 확인한다.
ruleFile="$(mktemp "$runnerDir/.sudoers.XXXXXX")"
trap 'rm -f "$ruleFile"' EXIT
printf '%s\n' 'ubuntu ALL=(root) NOPASSWD: /usr/bin/systemctl restart vscoke-api.service' > "$ruleFile"
sudo visudo -cf "$ruleFile"
sudo install -o root -g root -m 0440 "$ruleFile" /etc/sudoers.d/vscoke-api-deploy
if [[ ! -f .service ]]; then
  sudo ./svc.sh install ubuntu
fi
sudo ./svc.sh start
systemctl is-active "actions.runner.icecokel-VSCoke.${runnerName}.service"
systemctl is-enabled "actions.runner.icecokel-VSCoke.${runnerName}.service"
sudo -n -l /usr/bin/systemctl restart vscoke-api.service
echo 'OCI VSCoke runner 준비 완료. GitHub에서 online 상태를 확인하세요.'
