#!/usr/bin/env bash
set -euo pipefail
umask 077

# 관리자가 OCI에서 실행한다. 최종 DB 복원과 DNS 변경은 별도 단계다.
test "$(uname -m)" = aarch64
test "$(id -un)" = ubuntu
test "$(hostname)" = oci-termux-prod-01
app=/home/ubuntu/vscoke-api
stage=/home/ubuntu/vscoke-api-rehearsal/cutover
tunnel=cc5f9f8e-fe12-436b-b243-be03466df18c
test -f "$app/current/revision"
test -f "$stage/oci-tunnel-credentials.json"
cd "$stage"
python3 - <<'PY'
import base64
import json
import re
try:
    with open('oci-tunnel-credentials.json', encoding='utf-8') as source:
        credentials = json.load(source)
    if credentials['TunnelID'] != 'cc5f9f8e-fe12-436b-b243-be03466df18c':
        raise ValueError()
    if len(base64.b64decode(credentials['TunnelSecret'], validate=True)) != 32:
        raise ValueError()
    if not re.fullmatch(r'[a-f0-9]{32}', credentials['AccountTag']):
        raise ValueError()
except Exception:
    raise SystemExit('OCI 전용 터널 자격 증명 검증 실패') from None
PY

package=cloudflared-linux-arm64.deb
curl --fail --location --retry 3 --output "$package" \
  "https://github.com/cloudflare/cloudflared/releases/download/2026.11.0/$package"
printf '%s  %s\n' ce671bc2b4afbd16b43f9a3c279527e9e2be8b30b87648047a1f95cccfbacdfd "$package" \
  | sha256sum --check --status
if [[ -x /usr/bin/cloudflared ]]; then
  /usr/bin/cloudflared --version | grep -F '2026.11.0'
else
  sudo dpkg -i "$package"
fi

# 원본 DB의 libc 정렬 설정을 복원할 수 있는지 쓰기 중단 전에 검증한다.
if ! command -v locale-gen >/dev/null; then
  sudo apt-get install -y --no-install-recommends locales
fi
sudo locale-gen en_US.UTF-8
locale -a | grep -Fx en_US.utf8
probe="vscoke_cutover_probe_$$"
sudo -u postgres createdb --template=template0 --owner=vscoke_api --encoding=UTF8 \
  --lc-collate=en_US.utf8 --lc-ctype=en_US.utf8 "$probe"
trap 'sudo -u postgres dropdb "$probe"' EXIT
sudo -u postgres dropdb "$probe"
trap - EXIT

install -m 600 oci-tunnel-credentials.json "$app/.local/cloudflared-credentials.json"
cat > "$app/.local/cloudflared.yml" <<YAML
tunnel: $tunnel
credentials-file: $app/.local/cloudflared-credentials.json
ingress:
  - hostname: api.icecoke.kr
    service: http://127.0.0.1:3000
  - service: http_status:404
YAML
cat > cloudflared-vscoke-api.service <<'UNIT'
[Unit]
Description=VSCoke API Cloudflare Tunnel on OCI
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
ExecStart=/usr/bin/cloudflared tunnel --config /home/ubuntu/vscoke-api/.local/cloudflared.yml --no-autoupdate --metrics 127.0.0.1:20242 run cc5f9f8e-fe12-436b-b243-be03466df18c
Restart=always
RestartSec=5
UMask=0077
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT
systemd-analyze verify "$stage/cloudflared-vscoke-api.service"
sudo install -m 644 cloudflared-vscoke-api.service /etc/systemd/system/cloudflared-vscoke-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared-vscoke-api.service
systemctl is-enabled cloudflared-vscoke-api.service
systemctl is-active cloudflared-vscoke-api.service
for attempt in $(seq 1 30); do
  if curl --silent --fail --max-time 2 http://127.0.0.1:20242/ready >/dev/null; then
    echo 'OCI 전용 터널 연결·DB 로케일 준비 완료. 운영 DNS와 DB는 아직 전환하지 않았습니다.'
    exit 0
  fi
  sleep 1
done
echo 'OCI 터널 연결 대기 실패. DNS 전환 전에 cloudflared-vscoke-api.service를 점검하세요.' >&2
exit 1
