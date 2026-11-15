#!/usr/bin/env bash
set -euo pipefail
umask 077

# 인프라 관리자(ubuntu)가 OCI 터미널에서 실행한다. API 데이터·터널은 변경하지 않는다.
# runner 파일·등록·서비스는 전용 계정 vscoke-api가 소유하고 실행한다.
test "$(uname -s)" = Linux
test "$(uname -m)" = aarch64
test "$(id -un)" = ubuntu
runnerUser=vscoke-api
runnerDir=/srv/vscoke-api/.local/actions-runner
id "$runnerUser" >/dev/null
# 관리자는 700 권한의 runner 디렉터리에 들어갈 수 없으므로 명령마다 작업 경로를 지정한다.
asRunner() { sudo -u "$runnerUser" -- env -C "$runnerDir" "$@"; }
asRoot() { sudo env -C "$runnerDir" "$@"; }
repository=https://github.com/icecokel/VSCoke
runnerName=vscoke-api-oci-01
# 앱 루트는 계정 분리 스크립트가 만든다. runner 경로는 전용 계정 권한으로만 만든다.
sudo -u "$runnerUser" -- mkdir -p "$runnerDir"

if asRunner test -f .runner; then
  # 다른 저장소의 기존 러너를 덮어쓰거나 재등록하지 않는다.
  asRunner python3 - <<'PY'
import json
with open('.runner', encoding='utf-8') as source:
    settings = json.load(source)
if settings.get('gitHubUrl', '').rstrip('/').lower() != 'https://github.com/icecokel/vscoke' or settings.get('agentName') != 'vscoke-api-oci-01':
    raise SystemExit('다른 러너가 등록된 경로입니다. 설치를 중단합니다.')
PY
else
  archive=actions-runner-linux-arm64-2.338.2.tar.gz
  asRunner curl --fail --location --retry 3 --output "$archive" \
    "https://github.com/actions/runner/releases/download/v2.338.2/$archive"
  printf '%s  %s\n' \
    670adb2f268fe21dcbb58b3db0e0aa9d5b3bddfe2c651481336e561ff86de945 "$archive" \
    | asRunner sha256sum --check --status
  asRunner tar -xzf "$archive"
  asRoot ./bin/installdependencies.sh
  echo '등록 토큰 입력란에서 Mac 클립보드의 토큰을 붙여넣으세요. 토큰은 공유하지 마세요.'
  asRunner ./config.sh --url "$repository" --name "$runnerName" --labels vscoke-api,oci-01 --work _work </dev/tty
fi

# 검증한 단일 명령 권한만 설치한다. 파일 교체 전에 문법을 확인한다.
ruleFile="$(mktemp)"
trap 'rm -f "$ruleFile"' EXIT
printf '%s\n' "$runnerUser ALL=(root) NOPASSWD: /usr/bin/systemctl restart vscoke-api.service" > "$ruleFile"
sudo visudo -cf "$ruleFile"
sudo install -o root -g root -m 0440 "$ruleFile" /etc/sudoers.d/vscoke-api-deploy
if ! asRunner test -f .service; then
  asRoot ./svc.sh install "$runnerUser"
fi
asRoot ./svc.sh start
systemctl is-active "actions.runner.icecokel-VSCoke.${runnerName}.service"
systemctl is-enabled "actions.runner.icecokel-VSCoke.${runnerName}.service"
asRunner sudo -n -l /usr/bin/systemctl restart vscoke-api.service
echo 'OCI VSCoke runner 준비 완료. GitHub에서 online 상태를 확인하세요.'
