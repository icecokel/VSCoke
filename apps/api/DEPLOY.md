# API 배포 가이드

배포 목표는 춘천 OCI 1호기의 네이티브 systemd다. 2026-11-14 현재 공개 운영은 Mac mini에
남아 있으며 OCI DB는 리허설 사본이다. 코드 배포와 최종 데이터·DNS 전환을 구분한다.

## 1. OCI 인프라 인계

icecoke-ops의 기준 기록은 `docs/plans/oci-migration/vscoke-api-01.md`다. VSCoke 변경은
`worktrees/ci/oci-native`, 브랜치 `codex/ci/oci-native`에서 준비했다. 준비 커밋 `39efa56b`의
API_HOST와 write-native를 재사용하고 최신 로컬 main에 통합했다. 원래 작업 브랜치의
미커밋 변경은 별도로 보존했다.

| 구분        | 설치·확인 기준                                                          |
| ----------- | ----------------------------------------------------------------------- |
| SSH         | `ssh -F /Users/smlee/icecoke-ops/config/ssh-config oci-01`              |
| 앱 루트     | `/home/ubuntu/vscoke-api`, ubuntu 소유·700                              |
| runner      | `/home/ubuntu/actions-runner-vscoke-api`, 이름 `vscoke-api-oci-01`      |
| labels      | `self-hosted,Linux,ARM64,vscoke-api,oci-01`                             |
| 서비스      | `vscoke-api.service`, `postgresql@16-main.service`                      |
| DB 환경     | `/home/ubuntu/vscoke-api/.local/db.env`, 600, 전용 `vscoke_api` role·DB |
| 앱 환경     | `/home/ubuntu/vscoke-api/api.env`, 600                                  |
| 캐시·로그   | `.cache/embeddings`, `logs` (릴리스 밖)                                 |
| 활성화 신호 | `.local/activate` (인프라 검증 완료 후 생성)                            |

2026-11-14 17:35 KST 관리자가 직접 설치한 뒤 GitHub에서 `vscoke-api-oci-01`의 online 상태와
필요한 Linux/ARM64/vscoke-api/oci-01 label을 확인했다. systemd는 active/running·enabled다.
API·PostgreSQL·Discord 봇과 로컬 API health도 정상이다. 최초 설치 스크립트 마지막의
`Must run as sudo`는 비관리자 `svc.sh status` 호출에서 발생했으며 서비스 시작 실패가 아니다.
스크립트의 상태 조회를 읽기 전용 systemctl 명령으로 수정했다. 실제 workflow 실행 검증은 남아 있다.

인프라 담당자는 GitHub 저장소 **Settings → Actions → Runners**의 공식 Linux ARM64 다운로드·
체크섬 검증 명령으로 전용 디렉터리에 설치한다. 등록 토큰은 config.sh의 대화형 입력으로 전달하고
로그·셸 이력에 남기지 않는다. 등록 및 관리자 서비스 설치 명령:

```bash
cd /home/ubuntu/actions-runner-vscoke-api
./config.sh --url https://github.com/icecokel/VSCoke --name vscoke-api-oci-01 --labels vscoke-api,oci-01 --work _work
sudo ./svc.sh install ubuntu
sudo ./svc.sh start
```

기본 Linux/ARM64 label을 유지한다. Discord의 `discord-bot-oci` 러너와 설치·work 디렉터리·
서비스를 분리한다. `git`, `curl`, `tar`, `xz-utils`, `util-linux`(flock), `sudo`가 필요하다.
Node/pnpm은 Actions가 설치한다. Mac·Docker·SSH 빌드에 의존하지 않는다.

직접 실행용 `scripts/setup-api-oci-runner.sh`는 공식 runner 2.338.2 Linux ARM64 배포본의
SHA-256을 검증한 뒤 의존성·등록·서비스·아래 sudoers를 준비한다. 다른 저장소의 runner가
같은 경로에 등록돼 있으면 중단한다. 기존 VSCoke 등록이 있으면 검증 후 서비스 설치를 이어간다.
Mac 터미널에서 다음 명령을 실행하고, 등록 토큰을 물으면 클립보드 내용을 붙여넣는다.
토큰을 명령 인자·셸 이력·채팅에 직접 쓰지 않는다.

```bash
gh api --method POST repos/icecokel/VSCoke/actions/runners/registration-token --jq .token | pbcopy
scp -F /Users/smlee/icecoke-ops/config/ssh-config /Users/smlee/vscoke/worktrees/ci/oci-native/scripts/setup-api-oci-runner.sh oci-01:/home/ubuntu/vscoke-api-rehearsal/admin/setup-api-oci-runner.sh
ssh -t -F /Users/smlee/icecoke-ops/config/ssh-config oci-01 'bash /home/ubuntu/vscoke-api-rehearsal/admin/setup-api-oci-runner.sh'
```

기존 unit의 실행 계약을 유지한다. unit의 전체 관리 원본은 icecoke-ops에 있다.

```ini
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/vscoke-api/current
ExecStartPre=/usr/bin/test -f /home/ubuntu/vscoke-api/current/.env
ExecStart=/home/ubuntu/vscoke-api/current/bin/node scripts/api-deploy-env.mjs run bin/node apps/api/dist/src/main.js
Restart=always
RestartSec=10
UMask=0077
```

관리자는 `/etc/sudoers.d/vscoke-api-deploy`에 아래 한 명령만 허용하고
`sudo visudo -cf /etc/sudoers.d/vscoke-api-deploy`로 검증한다. API/runner는 ubuntu 권한으로
실행되므로 외부 PR 코드는 운영 러너에서 실행하지 않는다.

```sudoers
ubuntu ALL=(root) NOPASSWD: /usr/bin/systemctl restart vscoke-api.service
```

점검(키·환경 내용을 출력하지 않음):

```bash
systemctl is-active vscoke-api.service postgresql@16-main.service
systemctl is-enabled vscoke-api.service
sudo -n -l /usr/bin/systemctl restart vscoke-api.service
ss -ltn '( sport = :3000 or sport = :5432 )'
curl -fsS http://127.0.0.1:3000/health
```

관리자 실행이 거절되면 우회하지 않고 정확한 명령과 거절 이유를 인계한다. cloudflared 서비스·
인증·터널 route 설치는 icecoke-ops에서 처리한다. 이 코드가 해당 서비스를 설치하거나 운영 도메인을
전환하지 않는다.

## 2. 환경 변수 배포 (GitHub Secret)

앱 비밀값의 원본은 기존 Repository Secret `API_ENV_PRODUCTION`이다. write-native는
`.local/db.env`의 DB host/port/user/database/password와 `API_HOST=127.0.0.1`, `PORT=3000`,
`TRUST_PROXY=loopback`, 호스트 캐시 `.cache/embeddings`, offline 모드만 덮어쓴다.
Claude·Google·JEV·CORS 값은 보존한다. 설치 계약의 DB 암호는 64자리 소문자 hex이며
host/role이 다르면 자동 적용을 거절한다. `api.env`는 600 권한으로 원자 교체하며 shell로 source하지 않는다.

`API_DEPLOY_DIR`는 `/home/ubuntu/vscoke-api` 또는 미설정으로 둔다. 최초 리허설은
**Deploy API to OCI (native)**의 workflow_dispatch, `verify_public=false`로 실행한다.
Repository variable `API_VERIFY_PUBLIC`도 미설정 또는 `false`로 둔다. 전환 후 push 배포용
variable을 `true`로 바꾸고 수동 실행도 `verify_public=true`를 사용한다. 전환 전 공개 health는
Mac의 응답일 수 있으므로 OCI 배포 증거로 사용하지 않는다.

## 3. 빌드·배포와 실패 복구

전용 OCI 러너에서 API lint·전체 단위 테스트, `pnpm test:tooling`, health 도구 테스트 후 빌드한다.
`package-api-native.sh`는 고정 lockfile로 production 의존성을 독립 설치하고 API dist·package.json·
node_modules, Node, 환경/health 도구, 공개 이력 자료만 남긴다. env·개인 원본·DB·인증 상태는 제외한다.
ONNX 네이티브 모듈 로드도 검사한다.

배포 순서:

1. flock으로 중복 실행을 막고 이전 current·API env를 `.local/deploy-<release-id>`에 보존한다.
2. `releases/<sha>-<run-id>-<attempt>`에 번들을 두고 `revision`에 커밋을 기록한다. `.env`·`logs`는 공유 경로에 연결한다.
3. write-native → 미적용 migration 확인 → 공개 이력 import → 필요한 vector index를 수행한다.
4. current symlink 원자 교체 후 허용된 systemd restart 한 명령을 수행한다.
5. 로컬 health·resume·recipes·espresso-history/beans와 선택적 공개 endpoint를 검사한다.
6. 성공 시에만 workflow가 `.last-successful-deploy`를 기록한다. 다음 배포 판정은 `current/revision`과 이 기록이 일치할 때만 생략할 수 있다. 수동 복구 뒤의 오래된 성공 기록은 신뢰하지 않는다. 이전 릴리스는 보존한다.

실패·일반 종료 신호에서는 이전 env·current를 복구한다. 교체 이후면 이전 서비스를 재시작·검사한다.
import/index의 DB 쓰기와 migration은 코드 복구로 되돌리지 않는다. 이전 코드와 호환되는 schema를
유지한다. 재시작 시 메모리의 진행 중 Beat Jev 매치는 유실된다. SIGKILL·호스트 장애는 자동 trap
대상이 아니므로 실패 배포의 복구 기록을 사용한다.

활성 배포가 없는지 확인하고 같은 flock을 확보한 뒤 수동 복구한다. `<release-id>`는 실패 배포의 ID다.

```bash
cd /home/ubuntu/vscoke-api
exec 9>.local/deploy.lock
flock -n 9
STATE=.local/deploy-<release-id>
PREVIOUS="$(cat "$STATE/previous-release")"
cp -p "$STATE/api.env" api.env.rollback
mv -f api.env.rollback api.env
"$PREVIOUS/bin/node" -e 'const fs=require("node:fs"); fs.symlinkSync(process.argv[1], "current.rollback"); fs.renameSync("current.rollback", "current");' "$PREVIOUS"
sudo -n /usr/bin/systemctl restart vscoke-api.service
API_HEALTH_URL=http://127.0.0.1:3000/health current/bin/node current/scripts/check-api-health.mjs
```

## 4. DB schema 변경

운영 migration 자동 실행은 추가하지 않는다. 백업·ledger 확인 후 후보 릴리스의 TypeORM CLI로
수동 적용하고 workflow를 다시 실행한다. 미적용 migration으로 중단한 후보는 releases에 보존된다.
DB 백업/복원은 icecoke-ops 검증 도구를 사용하며 dump를 Git·Actions artifact로 업로드하지 않는다.

```bash
cd /home/ubuntu/vscoke-api/releases/<candidate-release-id>
bin/node scripts/api-deploy-env.mjs run bin/node apps/api/node_modules/typeorm/cli.js -d apps/api/dist/src/data-source.js migration:show
# backup 확인 및 migration 검토 후에만 실행
bin/node scripts/api-deploy-env.mjs run bin/node apps/api/node_modules/typeorm/cli.js -d apps/api/dist/src/data-source.js migration:run
```

후보 `.env`는 공유 env를 가리킨다. 최초 OCI env를 아직 만들지 않았거나 실패 복구로 이전 env가
복원된 경우 OCI 변환 결과인지 먼저 확인한다. Mac DB 자격 증명으로 migration을 실행하지 않는다.
코드 롤백과 DB 복원을 구분하고 breaking 변경은 expand/contract로 나눈다. rollback 가능한 마지막
migration은 같은 명령에서 `migration:run`을 `migration:revert`로 바꿔 실행한다. destructive baseline의
revert는 의도적으로 실패한다. backup 복구가 필요하면 API 쓰기를 멈추고 ops의 snapshot 검증·복원
절차를 수행한 뒤 서비스를 시작한다. schema와 ledger를 수동으로 맞춰 통과시키지 않는다.

### Legacy baseline 주의

`CreateLegacyCoreSchema1759999999999`는 migration 도입 전에 생성된 `public.user`,
`public.game_history`, `public.game_history_gametype_enum`을 ledger에 편입합니다. 세 객체가 모두
없으면 canonical schema를 만들고, 모두 있으면 알려진 정확한 schema만 채택합니다. 일부만 있거나
열·제약·enum·필수 index가 다르면 자동 수리 없이 실패합니다.

운영 최초 적용 전에는 세 객체의 schema와 TypeORM `migrations` ledger를 함께 덤프합니다.
baseline은 `SKY_DROP` enum만 허용합니다. 실패 시 drop, alter 또는 ledger 수동 삽입을 하지 말고
차이를 먼저 검토합니다. 이 baseline의 `down`은 기존 데이터 삭제를 막기 위해 의도적으로
실패합니다.

`CreateLegacyHobbySchema1795000000002`는 같은 방식으로 synchronize 시절의 `espresso_bean`,
`espresso_history`, `espresso_round`, `recipe`, `word`를 편입합니다. 다섯 table이 모두 없으면 만들고, 모두
있으면 그대로 채택하며, 일부만 있으면 실패합니다. Mac mini 운영 DB에는 2026-10-25 Ubuntu dump에서 이
table들을 데이터와 함께 먼저 복원했으므로 이 migration은 ledger 기록만 남깁니다.

### Migration 생성

아래 `<kebab-summary>`는 실제 변경 요약의 kebab-case 이름으로 바꿉니다.

빈 migration을 만들 때:

```bash
pnpm --filter @vscoke/api migration:create 'src/migrations/<kebab-summary>'
```

현재 entity와 연결된 DB를 비교해 migration 초안을 만들 때:

```bash
pnpm --filter @vscoke/api migration:generate 'src/migrations/<kebab-summary>'
```

`migration:generate`는 `apps/api/.env`의 `DB_*`가 가리키는 로컬 DB schema와 entity 차이를 비교합니다.
운영 PostgreSQL은 OCI loopback에서만 받으므로 운영 schema와 비교하려면 운영 backup을 로컬 DB에
restore한 뒤 실행합니다. 생성된 migration의 `up`, `down`을 모두 검토하고, rollback이 불가능한 변경은
배포 전에 별도 수동 복구 절차를 이 문서나 PR에 남깁니다.

### Local dry run

schema 변경 PR에서는 운영 반영 전에 로컬 또는 staging DB에서 migration 실행과 되돌리기를 확인합니다.

```bash
pnpm --filter @vscoke/api build
pnpm --filter @vscoke/api migration:show
pnpm --filter @vscoke/api migration:run
pnpm --filter @vscoke/api migration:revert
pnpm --filter @vscoke/api migration:run
```

`migration:show`, `migration:run`, `migration:revert`는 `dist/src/data-source.js`를 사용하므로 먼저 API를 build합니다.

## 5. 최종 운영 전환 (icecoke-ops)

아래는 아직 미완료인 인프라·운영 작업이다. 리허설 DB에 바로 트래픽을 보내지 않는다.

1. 설치한 OCI 전용 runner에서 재시작 권한을 확인하고 새 workflow를 실제 실행한다.
2. 새 release의 Node 버전·ARM64·loopback·공유 로그·offline E5 모델 로드를 확인한다.
3. Origin `https://vscoke.icecoke.kr`을 포함해 실제 `/resume-rag/chat`의 첫 질문·후속 질문,
   grounded/출처를 검사한다. OAuth·인증 경로와 Discord 서비스도 확인한다.
4. Mac 쓰기를 중단하고 최신 dump를 만든 뒤 OCI API를 중지하고 복원한다. 최신 snapshot의
   테이블 행 수·인덱스·ledger·벡터를 다시 대조한다.
5. OCI용 cloudflared 서비스·인증을 준비하고 ingress를 `http://127.0.0.1:3000`으로 설정한 뒤
   public hostname을 전환한다. 같은 hostname의 Mac route를 함께 남기지 않는다.
6. `API_VERIFY_PUBLIC=true`, 수동 `verify_public=true`로 새 배포·공개 endpoint·채팅·로그인을 검사한다.
7. OCI에 새 쓰기가 생긴 뒤 Mac으로 복귀하려면 OCI 쓰기를 중단하고 최신 데이터를 Mac에 먼저
   반영한다. DNS만 되돌려 데이터가 분기되지 않게 한다.

39efa56b의 기존 systemd·DB·벡터 리허설 증거는 새 workflow 배포 성공 증거를 대체하지 않는다.

## 6. 이번 변경의 검증 기록 (2026-11-14)

코드 기준점은 로컬 main `e3dc9afd`와 준비 커밋 `39efa56b`다. 원래 작업 트리의 변경은 보존했다.

- Node 24.22.1에서 API lint, API 단위 테스트 64개 suite/484개 test 통과.
- `pnpm test:tooling` 31개 통과. 수동 복구 후 current/성공 기록 불일치도 재현·검증했다.
  실제 배포 셸/환경 변환/HTTP 검사를 실행하고 DB·systemd 경계를
  합성해 migration/import/index/restart/local/public health/Secret 실패에서 이전 코드·환경 복구,
  cache·DB 설정·로그·백업 보존을 확인했다. macOS 하네스의 flock은 대역이고 Linux CI는 실제 flock을 사용한다.
- `pnpm build`로 웹과 API 모두 빌드. health 도구 테스트 8개, bash 문법, Prettier, git diff 검사 통과.
- actionlint 1.7.12로 새 workflow의 문법·표현식·사용자 runner label 검사 통과. ShellCheck는 미실행.
- 고정 lockfile로 독립 production 번들을 실제 생성하고 경로 이동 후 의존성 symlink 902개가
  번들 안을 가리키는지 확인했다. 이동한 번들에서 Nest·TypeORM·ONNX 모듈을 로드했다.
  이 패키징 검사는 macOS ARM64이며 OCI Linux ARM64에서의 새 번들 실행 검증은 남아 있다.
- OCI 읽기 점검: Node 24.22.1, API·PostgreSQL active, `/resume`·`/recipes` HTTP 200.
  이는 기존 `39efa56b` 서비스의 점검이다. 새 workflow의 실배포 결과는 아니다.
- 초기 검증 당시 GitHub에는 VSCoke Mac runner만 있었고 OCI에는 Discord runner만 실행 중이었다.
  이후 관리자가 전용 OCI runner와 재시작 sudoers를 설치했다. runner의 online·active·enabled 상태는
  확인했으며, 재시작 권한 조회·새 workflow 실제 실행·cloudflared·최신 데이터/터널 전환은 남아 있다.

새 코드의 검증 과정에서 운영 env·DB·DNS·서비스·GitHub Secret을 변경하지 않았다.

관리자 인계: 이 세션의 `PreToolUse` 셸 훅이 아래 권한 조회도 `Blocked sudo from Codex shell hooks`로
차단했다. 조회를 우회하지 않았다. 이후 관리자가 runner 설치를 완료했으므로 아래 명령으로
재시작 권한을 확인하면 새 workflow 실행 단계로 진행할 수 있다.

```bash
ssh -F /Users/smlee/icecoke-ops/config/ssh-config oci-01 'sudo -n -l /usr/bin/systemctl restart vscoke-api.service'
```
