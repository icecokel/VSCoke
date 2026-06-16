# API Git History Integration Report

작성일: 2026-06-13

## 결론

`apps/api` import는 **전체 commit graph 기준으로는 정상 연결**되어 있다. 그러나 `apps/api` 경로 기준의 `git log`/파일 히스토리는 기존 백엔드 저장소 이력을 자연스럽게 따라가지 못한다.

따라서 목표가 "기존 API 커밋을 monorepo commit graph에 보존"하는 것이라면 현재 상태는 사용 가능하다. 목표가 "GitHub UI나 `git log -- apps/api/...`에서 기존 API 파일별 히스토리와 blame을 그대로 보는 것"이라면 현재 상태는 미흡하다.

## 확인 결과

### 1. Subtree merge 자체는 연결됨

`apps/api` 편입 커밋은 두 부모를 가진 merge commit이다.

```txt
commit a5cb28d4ed88d7bbc9d1786cc249b99481316e72
parent 5fb4d319414649a206b9cfb95c1d7640586fc64b
parent 66def307927f576b1e25a339289cda50cc292716

git-subtree-dir: apps/api
git-subtree-mainline: 5fb4d319414649a206b9cfb95c1d7640586fc64b
git-subtree-split: 66def307927f576b1e25a339289cda50cc292716
```

원격 백엔드 저장소의 `main` HEAD도 동일한 커밋이다.

```txt
66def307927f576b1e25a339289cda50cc292716 refs/heads/main
```

즉 `git@github.com:icecokel/vscoke-api.git`의 `main` 이력은 monorepo graph의 두 번째 부모로 들어와 있다.

### 2. 전체 그래프에서는 기존 API 이력이 보임

아래 명령으로 기존 API 커밋들이 확인된다.

```bash
git log --oneline a5cb28d^2
```

예시:

```txt
66def30 feat: 긱뉴스 상세 조회 API 추가
b2937d6 feat:cors 기본 허용 오리진 추가
088600c feat: 긱뉴스 수집 번역 배치 추가
0338c5a fix(game):랭킹gameType필수화
2934757 chore:미사용코드정리및에이전트규칙추가
```

백엔드 이력 커밋 수:

```bash
git rev-list --count a5cb28d^2
# 45
```

### 3. `apps/api` 경로 기준 로그는 기존 API 이력을 따라가지 못함

아래 명령은 monorepo import 이후 커밋만 보여준다.

```bash
git log --oneline -- apps/api
```

결과:

```txt
998410e build(api):백엔드 pnpm 워크스페이스 설정
a5cb28d feat(api):백엔드 앱 모노레포 편입
5fb4d31 chore(api):자리 표시자 파일 제거
0c5c2c7 refactor:모노레포 웹 앱 구조 정리
```

파일 단위도 동일하다.

```bash
git log --oneline -- apps/api/src/main.ts
```

결과:

```txt
a5cb28d feat(api):백엔드 앱 모노레포 편입
```

반면 기존 백엔드 부모 이력에서는 같은 파일이 루트 경로 `src/main.ts`로 존재한다.

```bash
git log --oneline a5cb28d^2 -- src/main.ts
```

예시:

```txt
b2937d6 feat:cors 기본 허용 오리진 추가
2934757 chore:미사용코드정리및에이전트규칙추가
da37f9e feat: Wordle 단어 검증 및 유효성 검사 API 추가
b7ca8d0 feat: NestJS 프로젝트 초기 설정
```

## 원인

현재 방식은 `git subtree add --prefix=apps/api ... main`이다. 이 방식은 원격 저장소 이력을 merge parent로 보존하지만, 과거 커밋의 파일 경로를 `apps/api/...`로 재작성하지 않는다.

그래서 기존 API 커밋의 파일 경로는 여전히 `src/main.ts`, `package.json` 같은 백엔드 저장소 루트 기준이다. monorepo import 커밋에서만 해당 파일들이 `apps/api/src/main.ts`, `apps/api/package.json`로 새로 추가된 것처럼 보인다.

## 영향

- GitHub commit graph나 `git log --graph`에서는 기존 API 이력을 확인할 수 있다.
- `git log -- apps/api`는 기존 API 커밋을 보여주지 않는다.
- GitHub UI에서 `apps/api` 파일 History를 열면 import 커밋부터 보일 가능성이 높다.
- `git blame apps/api/...`도 기존 백엔드 커밋 대신 import 커밋을 가리킬 가능성이 높다.
- 기존 API 파일의 과거 변경을 보려면 두 번째 부모와 기존 경로를 직접 지정해야 한다.

예:

```bash
git log a5cb28d^2 -- src/main.ts
git show b2937d6:src/main.ts
```

## 선택지

### 선택지 A: 현재 subtree 이력 유지

현재 상태를 유지한다. 전체 이력 보존과 향후 subtree 동기화 가능성이 중요하다면 이 방식은 받아들일 수 있다.

장점:

- 이미 API remote HEAD와 subtree split이 일치한다.
- 기존 API 이력은 graph에 보존되어 있다.
- 현재 monorepo 작업을 되돌릴 필요가 없다.

단점:

- `apps/api` 경로 기준 파일 히스토리와 blame이 자연스럽지 않다.
- 기존 API 변경 추적 시 `a5cb28d^2`와 기존 루트 경로를 알아야 한다.

### 선택지 B: API 이력을 `apps/api` 경로로 재작성 후 다시 편입

백엔드 저장소를 임시 clone한 뒤 `git filter-repo --to-subdirectory-filter apps/api` 같은 방식으로 모든 과거 커밋 경로를 `apps/api/...`로 재작성하고 monorepo에 merge한다.

장점:

- `git log -- apps/api/src/main.ts`가 기존 API 커밋까지 자연스럽게 이어진다.
- GitHub UI 파일 History와 blame 품질이 좋아진다.

단점:

- 현재 import 커밋 이후의 API 통합 커밋을 다시 정리해야 한다.
- 이미 공유된 브랜치라면 이력 교체 비용이 커진다.
- subtree 방식의 원격 동기화 메타데이터와는 다른 전략이 된다.

### 선택지 C: 현재 상태 유지 + 운영 문서에 이력 조회 방법 추가

monorepo 구조는 유지하고, 기존 API 이력 조회 방법만 문서화한다.

장점:

- 추가 리스크가 가장 낮다.
- 지금 브랜치의 작업을 보존한다.

단점:

- 파일 단위 히스토리 UX 문제는 해결하지 않는다.

## 권장

아직 `main`에 병합하기 전이고, 앞으로 GitHub UI에서 `apps/api` 파일별 히스토리와 blame을 자주 볼 계획이라면 **선택지 B**를 검토하는 것이 좋다.

반대로 기존 API 이력이 graph에 남아 있으면 충분하고, 앞으로의 변경 이력만 `apps/api` 경로에서 잘 보이면 된다면 **선택지 A 또는 C**로 충분하다.

현재 상태에서 즉시 필요한 최소 조치는 이 보고서를 유지하고, 기존 API 이력 조회가 필요할 때 아래 명령을 사용하는 것이다.

```bash
git log a5cb28d^2 -- <기존-api-루트-기준-경로>
git show <commit>:<기존-api-루트-기준-경로>
```
