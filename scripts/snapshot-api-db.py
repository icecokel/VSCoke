#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mac 원본의 동일 snapshot을 덤프하고 격리 복원으로 내용·schema를 검증한다."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess as sp
import time

SOURCE = "vscoke-api-postgres-1"
API = "vscoke-api-api-1"
PSQL = 'exec psql -XqAt -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
ROOT = Path(__file__).resolve().parents[1]
MANIFEST = Path(__file__).with_name("api-db-manifest.sql").read_text(encoding="utf-8")


def checked(args, **options):
    result = sp.run(args, stderr=sp.PIPE, **options)
    if result.returncode:
        raise RuntimeError("검증 명령 실패: " + args[0])
    return result


def output(args, **options):
    return checked(args, stdout=sp.PIPE, text=True, **options).stdout.strip()


def database(container, command):
    return ["docker", "exec", "-i", container, "sh", "-ec", command]


def is_frozen():
    return output(["docker", "inspect", "--format", "{{.State.Running}}", API]) == "false"


def digest(path):
    result = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def snapshot(destination, allow_running):
    frozen = is_frozen()
    if not frozen and not allow_running:
        raise RuntimeError("Mac API 쓰기를 중단한 뒤 최종 snapshot을 만드세요.")
    destination.mkdir(mode=0o700, parents=True, exist_ok=False)
    dump = destination / "database.dump"
    image = output(["docker", "inspect", "--format", "{{.Image}}", SOURCE])
    with sp.Popen(database(SOURCE, PSQL), stdin=sp.PIPE, stdout=sp.PIPE,
                  stderr=sp.PIPE, text=True) as transaction:
        try:
            transaction.stdin.write(
                "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\n"
                "SET LOCAL idle_in_transaction_session_timeout='180s';\n"
                "SET LOCAL statement_timeout='120s';\nSELECT pg_export_snapshot();\n")
            transaction.stdin.flush()
            snapshot_id = transaction.stdout.readline().strip()
            if not re.fullmatch(r"[A-Fa-f0-9-]+", snapshot_id):
                raise RuntimeError("snapshot export 실패")
            with dump.open("xb") as target:
                checked(database(SOURCE, 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" '
                                 '--format=custom --no-owner --no-acl --lock-wait-timeout=5s '
                                 '--snapshot=' + snapshot_id), stdout=target, timeout=120)
            before, _ = transaction.communicate(MANIFEST + "\nCOMMIT;\n", timeout=120)
            if transaction.returncode:
                raise RuntimeError("원본 manifest 검증 실패")
        finally:
            if transaction.poll() is None:
                transaction.kill()

    isolated = output([
        "docker", "run", "--detach", "--rm", "--pull=never", "--read-only", "--network", "none",
        "--log-driver", "none", "--tmpfs", "/var/lib/postgresql/data:rw,size=512m",
        "--tmpfs", "/var/run/postgresql:rw,size=8m", "--tmpfs", "/tmp:rw,size=16m",
        "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "-e", "POSTGRES_USER=rehearsal",
        "-e", "POSTGRES_DB=rehearsal", image, "postgres", "-c", "listen_addresses="])
    try:
        for _ in range(60):
            ready = 'test "$(cat /proc/1/comm)" = postgres && pg_isready -q -U rehearsal -d rehearsal'
            if sp.run(database(isolated, ready), stdout=sp.DEVNULL, stderr=sp.DEVNULL).returncode == 0:
                break
            time.sleep(1)
        else:
            raise RuntimeError("격리 DB 준비 시간 초과")
        with dump.open("rb") as source:
            checked(database(isolated, 'exec pg_restore --exit-on-error --single-transaction '
                             '--no-owner --no-acl --no-comments -U "$POSTGRES_USER" -d "$POSTGRES_DB"'),
                    stdin=source, stdout=sp.DEVNULL, timeout=180)
        after = output(database(isolated, PSQL), input=MANIFEST, timeout=120)
        if before.strip() != after:
            raise RuntimeError("원본과 격리 복원본의 내용·schema·sequence가 다릅니다.")
    finally:
        checked(["docker", "rm", "-f", isolated], stdout=sp.DEVNULL)
    if frozen and not is_frozen():
        raise RuntimeError("snapshot 도중 Mac API가 다시 시작됐습니다. 최종 전환을 중단합니다.")
    lines = after.splitlines()
    result = {
        "source_frozen": frozen,
        "snapshot_matched": True,
        "tables": sum(line.startswith("table|") for line in lines),
        "indexes": sum(line.startswith("index|") for line in lines),
        "sequences": sum(line.startswith("sequence|") for line in lines),
        "migrations": sum(line.startswith("migration|") for line in lines),
        "vector_rows": int(next(line.split("|")[1] for line in lines if line.startswith("vector_rows|"))),
        "database": next(line.split("|")[1:] for line in lines if line.startswith("database|")),
        "archive_bytes": dump.stat().st_size,
        "dump_sha256": digest(dump),
    }
    (destination / "manifest.txt").write_text(after + "\n", encoding="utf-8")
    (destination / "database.sha256").write_text(result["dump_sha256"] + "  database.dump\n", encoding="utf-8")
    (destination / "verified.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    shutil.copyfile(Path(__file__).with_name("api-db-manifest.sql"), destination / "api-db-manifest.sql")
    print(json.dumps({"path": str(destination), **{key: value for key, value in result.items() if key != "dump_sha256"}}))


if __name__ == "__main__":
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--allow-running-source", action="store_true", help="전환에 사용할 수 없는 사전 점검용 사본")
    args = parser.parse_args()
    destination = args.output.resolve()
    if not destination.is_relative_to(ROOT / "output/cutover"):
        parser.error("덤프는 이 worktree의 output/cutover 안에만 저장합니다.")
    try:
        snapshot(destination, args.allow_running_source)
    except Exception as error:
        # DB 행·비밀값이 들어갈 수 있는 외부 도구 stderr는 출력하지 않는다.
        message = str(error) if isinstance(error, RuntimeError) else "snapshot 생성·검증 실패"
        raise SystemExit(message) from None
