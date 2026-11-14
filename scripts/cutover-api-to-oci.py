#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mac 터미널에서 실행: 쓰기 중단·최종 DB 복원·검증 후 공개 DNS를 OCI로 전환한다."""
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import subprocess as sp
import sys
import time
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SSH_CONFIG = "/Users/smlee/icecoke-ops/config/ssh-config"
STAGE = "/home/ubuntu/vscoke-api-rehearsal/cutover"
TUNNEL = "cc5f9f8e-fe12-436b-b243-be03466df18c"
PUBLIC = "https://api.icecoke.kr"
SOURCE_HEALTH = "http://127.0.0.1:3000/health"
SOURCE = "vscoke-api-api-1"


def checked(args, **options):
    options.setdefault("timeout", 60)
    result = sp.run(args, **options)
    if result.returncode:
        raise RuntimeError("단계 실행 실패: " + args[0])
    return result


def output(args):
    return checked(args, stdout=sp.PIPE, text=True).stdout.strip()


def remote(command, terminal=False):
    return ["ssh", *( ["-t"] if terminal else []), "-F", SSH_CONFIG,
            "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", "oci-01", command]


def running():
    return output(["docker", "inspect", "--format", "{{.State.Running}}", SOURCE]) == "true"


def health(url):
    request = Request(url, headers={"Cache-Control": "no-cache"})
    with urlopen(request, timeout=10) as response:
        payload = json.load(response)
    if payload.get("success") is not True or payload.get("data", {}).get("status") != "ok":
        raise RuntimeError("공개 API health 형식 불일치")
    return payload


def boot_time(payload):
    data = payload["data"]
    return datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00")).timestamp() - float(data["uptime"])


def cutover():
    folder = ROOT / "output/cutover"
    folder.mkdir(mode=0o700, parents=True, exist_ok=True)
    with (folder / "cutover.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        for journal in folder.glob("final-*/state.json"):
            phase = json.loads(journal.read_text(encoding="utf-8")).get("phase")
            if phase in ["dns_requested", "cutover_complete", "failed_after_dns_request_mac_stopped"]:
                raise RuntimeError("이전 DNS 전환 기록이 있습니다. 현재 운영 DB를 확인하기 전에는 반복 실행할 수 없습니다.")
        # 관리자 준비·터널 연결을 확인한 뒤에만 원본 쓰기를 중단한다.
        if not running():
            raise RuntimeError("Mac API가 이미 중지돼 있습니다. 이전 전환 기록을 확인한 뒤 진행하세요.")
        tunnels = json.loads(output(["cloudflared", "tunnel", "list", "--output", "json"]))
        if not any(tunnel["id"] == TUNNEL and tunnel.get("connections") for tunnel in tunnels):
            raise RuntimeError("OCI 전용 터널 연결을 먼저 준비하세요.")
        output(remote("systemctl is-active --quiet vscoke-api.service cloudflared-vscoke-api.service "
                      "postgresql@16-main.service && curl -fsS http://127.0.0.1:20242/ready >/dev/null"))
        if abs(boot_time(health(PUBLIC + "/health")) - boot_time(health(SOURCE_HEALTH))) >= 0.5:
            raise RuntimeError("공개 API가 Mac 원본과 일치하지 않습니다. 중복 전환을 중단합니다.")
        state_dir = folder / ("final-" + str(time.time_ns()))
        state_dir.mkdir(mode=0o700)
        state = {"phase": "prepared", "target_tunnel": TUNNEL, "started_at": datetime.now(timezone.utc).isoformat()}

        def record(phase):
            state["phase"] = phase
            temporary = state_dir / "state.next.json"
            temporary.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
            temporary.replace(state_dir / "state.json")

        frozen = False
        dns_attempted = False
        record("prepared")
        try:
            print("Mac API 쓰기를 중단하고 최종 snapshot을 생성합니다.", flush=True)
            frozen = True
            checked(["docker", "stop", "--time", "120", SOURCE], timeout=180)
            snapshot = state_dir / "source"
            checked([sys.executable, str(ROOT / "scripts/snapshot-api-db.py"), str(snapshot)], timeout=420)
            metadata = json.loads((snapshot / "verified.json").read_text(encoding="utf-8"))
            if metadata.get("source_frozen") is not True or metadata.get("snapshot_matched") is not True:
                raise RuntimeError("최종 snapshot 검증이 완료되지 않았습니다.")
            record("source_verified")
            files = [snapshot / name for name in ["database.dump", "database.sha256", "verified.json",
                                                  "manifest.txt", "api-db-manifest.sql"]]
            files.append(ROOT / "scripts/restore-api-db-oci.py")
            checked(["scp", "-F", SSH_CONFIG, *map(str, files), "oci-01:" + STAGE + "/"], timeout=120)
            print("OCI 사본을 백업한 뒤 최종 DB를 복원·대조합니다.", flush=True)
            checked(remote("python3 " + STAGE + "/restore-api-db-oci.py", terminal=True), timeout=420)
            restored = json.loads(output(remote("cat " + STAGE + "/restored-verified.json")))
            if restored.get("content_hashes_matched") is not True:
                raise RuntimeError("OCI 복원본의 내용 대조가 완료되지 않았습니다.")
            for key in ["tables", "indexes", "sequences", "migrations", "vector_rows"]:
                if restored.get(key) != metadata.get(key):
                    raise RuntimeError("OCI 복원 집계 불일치: " + key)
            if running():
                raise RuntimeError("Mac API가 다시 시작됐으므로 DNS를 전환할 수 없습니다.")
            target_health = json.loads(output(remote("curl -fsS http://127.0.0.1:3000/health")))
            state["restored"] = restored
            record("target_verified")
            # 요청이 실패해도 DNS가 변경됐을 수 있다. 이 시점부터 Mac을 자동 재개하지 않는다.
            dns_attempted = True
            record("dns_requested")
            checked(["cloudflared", "tunnel", "route", "dns", "--overwrite-dns", TUNNEL, "api.icecoke.kr"], timeout=60)
            for attempt in range(30):
                try:
                    public_health = health(PUBLIC + "/health?cutover=" + str(time.time_ns()))
                    if abs(boot_time(public_health) - boot_time(target_health)) < 0.5:
                        break
                except Exception:
                    pass
                time.sleep(2)
            else:
                raise RuntimeError("공개 API가 OCI 프로세스에 도달하는지 확인하지 못했습니다.")
            for path in ["resume", "recipes", "espresso-history/beans"]:
                with urlopen(PUBLIC + "/" + path, timeout=15) as response:
                    if response.status != 200:
                        raise RuntimeError("공개 endpoint 검사 실패")
            if running():
                raise RuntimeError("전환 후 Mac API가 다시 시작됐습니다. 이중 쓰기를 점검하세요.")
            record("cutover_complete")
            print("운영 DB와 api.icecoke.kr의 OCI 전환·검증 완료. Mac API는 중지 상태입니다.")
            print("전환 기록: " + str(state_dir / "state.json"))
        except BaseException:
            if frozen and not dns_attempted:
                try:
                    checked(["docker", "start", SOURCE], timeout=120)
                    for attempt in range(30):
                        try:
                            health(SOURCE_HEALTH)
                            break
                        except Exception:
                            time.sleep(1)
                    else:
                        raise RuntimeError("Mac API 복구 후 health 실패")
                    record("failed_before_dns_mac_resumed")
                    print("DNS 전환 전 실패해 Mac API를 복구·검증했습니다. 재시도에는 새 snapshot이 필요합니다.", file=sys.stderr)
                except Exception:
                    record("failed_before_dns_mac_restart_failed")
                    raise RuntimeError("DNS는 전환하지 않았으나 Mac API 복구 검증에 실패했습니다. 전환 기록을 확인하세요.") from None
            elif dns_attempted:
                record("failed_after_dns_request_mac_stopped")
                print("DNS 요청 이후 실패했습니다. Mac API를 중지 상태로 유지합니다. OCI 쓰기·DNS를 확인하고 데이터 역동기화 없이 Mac을 재개하지 마세요.", file=sys.stderr)
            raise


if __name__ == "__main__":
    os.umask(0o077)
    try:
        cutover()
    except Exception as error:
        message = str(error) if isinstance(error, RuntimeError) else "최종 전환 실패: 비공개 전환 기록을 확인하세요."
        raise SystemExit(message) from None
