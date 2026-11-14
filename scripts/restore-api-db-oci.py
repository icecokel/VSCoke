#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""관리자가 OCI에서 실행: 기존 사본 백업 후 최종 snapshot을 복원·대조한다."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess as sp
import time
from urllib.request import urlopen

APP = Path("/home/ubuntu/vscoke-api")
STAGE = Path("/home/ubuntu/vscoke-api-rehearsal/cutover")
PG = ["--host=/var/run/postgresql", "--port=5432", "--username=postgres"]


def checked(args, **options):
    result = sp.run(args, stderr=sp.PIPE, **options)
    if result.returncode:
        # pg_restore의 DETAIL에는 운영 행이 들어갈 수 있으므로 stderr를 그대로 전달하지 않는다.
        reason = "; ".join(line for line in result.stderr.decode(errors="replace").splitlines()
                           if line.startswith("sudo:"))
        raise RuntimeError("명령 실패: " + " ".join(args[:5]) + ("; " + reason if reason else ""))
    return result


def output(args, **options):
    return checked(args, stdout=sp.PIPE, **options).stdout.decode().strip()


def pg(command, *args):
    return ["sudo", "-n", "-u", "postgres", command, *PG, *args]


def digest(path):
    result = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def main():
    if output(["hostname"]) != "oci-termux-prod-01" or output(["id", "-un"]) != "ubuntu":
        raise RuntimeError("OCI 1호기의 ubuntu 계정에서만 실행합니다.")
    metadata = json.loads((STAGE / "verified.json").read_text(encoding="utf-8"))
    if metadata.get("source_frozen") is not True or metadata.get("snapshot_matched") is not True:
        raise RuntimeError("쓰기 중단·격리 복원 검증을 마친 최종 snapshot만 복원할 수 있습니다.")
    if metadata.get("database") != ["UTF8", "en_US.utf8", "en_US.utf8"]:
        raise RuntimeError("원본 DB encoding/locale을 확인하세요.")
    archive = STAGE / "database.dump"
    if digest(archive) != metadata.get("dump_sha256"):
        raise RuntimeError("최종 덤프 SHA-256 불일치")
    checked(["pg_restore", "--list", str(archive)], stdout=sp.DEVNULL)
    with (APP / ".local/deploy.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        backups = APP / "backups"
        backups.mkdir(mode=0o700, exist_ok=True)
        backup = backups / ("before-final-sync-" + str(time.time_ns()) + ".dump")
        api_stopped = False
        database_replaced = False
        try:
            checked(["sudo", "-n", "systemctl", "stop", "vscoke-api.service"], stdout=sp.DEVNULL)
            api_stopped = True
            with backup.open("xb") as target:
                checked(pg("pg_dump", "--format=custom", "--no-owner", "--no-acl", "--dbname=vscoke_api"),
                        stdout=target, timeout=120)
            checked(["pg_restore", "--list", str(backup)], stdout=sp.DEVNULL)
            backup.with_suffix(".sha256").write_text(digest(backup) + "  " + backup.name + "\n")
            # 전용 DB만 교체한다. role·암호·공유 env/cache/logs와 다른 DB는 유지한다.
            database_replaced = True
            checked(pg("dropdb", "--if-exists", "--force", "vscoke_api"), stdout=sp.DEVNULL)
            checked(pg("createdb", "--template=template0", "--owner=vscoke_api", "--encoding=UTF8", "--locale-provider=libc",
                       "--lc-collate=en_US.utf8", "--lc-ctype=en_US.utf8", "vscoke_api"), stdout=sp.DEVNULL)
            checked(pg("psql", "-Xq", "-v", "ON_ERROR_STOP=1", "--dbname=vscoke_api"),
                    input=b'CREATE EXTENSION vector; CREATE EXTENSION pgcrypto; CREATE EXTENSION "uuid-ossp";',
                    stdout=sp.DEVNULL)
            with archive.open("rb") as source:
                checked(pg("pg_restore", "--role=vscoke_api", "--no-owner", "--no-acl", "--no-comments",
                           "--single-transaction", "--exit-on-error", "--dbname=vscoke_api"),
                        stdin=source, stdout=sp.DEVNULL, timeout=180)
            actual = output(pg("psql", "-XqAt", "-v", "ON_ERROR_STOP=1", "--dbname=vscoke_api"),
                            input=(STAGE / "api-db-manifest.sql").read_bytes(), timeout=120)
            (STAGE / "restored-manifest.txt").write_text(actual + "\n", encoding="utf-8")
            if actual != (STAGE / "manifest.txt").read_text(encoding="utf-8").strip():
                raise RuntimeError("OCI의 테이블 내용·schema·sequence가 원본과 다릅니다. API를 중지 상태로 유지합니다.")
            checked(["sudo", "-n", "systemctl", "start", "vscoke-api.service"], stdout=sp.DEVNULL)
            for attempt in range(30):
                try:
                    with urlopen("http://127.0.0.1:3000/health", timeout=2) as response:
                        payload = json.load(response)
                    if payload.get("success") is True and payload.get("data", {}).get("status") == "ok":
                        break
                except Exception:
                    pass
                time.sleep(1)
            else:
                raise RuntimeError("최종 복원 후 OCI API health 실패")
            for path in ["resume", "recipes", "espresso-history/beans"]:
                with urlopen("http://127.0.0.1:3000/" + path, timeout=10) as response:
                    if response.status != 200:
                        raise RuntimeError("복원 후 endpoint 검사 실패")
            result = {"content_hashes_matched": True, "tables": metadata["tables"],
                      "indexes": metadata["indexes"], "sequences": metadata["sequences"],
                      "migrations": metadata["migrations"], "vector_rows": metadata["vector_rows"],
                      "previous_database_backup": str(backup)}
            (STAGE / "restored-verified.json").write_text(json.dumps(result, indent=2) + "\n")
            print(json.dumps(result))
        except Exception:
            if api_stopped and not database_replaced:
                checked(["sudo", "-n", "systemctl", "start", "vscoke-api.service"], stdout=sp.DEVNULL)
            elif database_replaced:
                checked(["sudo", "-n", "systemctl", "stop", "vscoke-api.service"], stdout=sp.DEVNULL)
            raise


if __name__ == "__main__":
    os.umask(0o077)
    try:
        main()
    except Exception as error:
        message = str(error) if isinstance(error, RuntimeError) else "OCI 최종 DB 복원 실패"
        raise SystemExit(message) from None
