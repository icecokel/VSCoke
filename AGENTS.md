# Local Agent Rules

## Commit Message Rules

- 제목 형식은 `type(scope):요약` 또는 `type:요약`
- 허용 타입은 `feat|fix|refactor|perf|docs|test|chore|ci|build|revert`
- `:` 뒤에는 공백 없이 바로 요약을 작성
- 제목 길이는 50자 이내
- 제목 끝에 `.`, `!`, `?`, `。` 같은 문장부호 금지
- 요약에는 한글 포함 필수
- 요약은 띄어쓰기를 포함한 자연스러운 문장 형태로 작성
- 예외 허용: `Merge ...`, `Revert ...`, `fixup! ...`, `squash! ...`

### Examples

- `feat(auth):구글 토큰 검증 추가`
- `fix:랭킹 중복 노출 수정`

## File Naming Rules

- 새 파일 생성은 기본적으로 케밥 케이스(`kebab-case`)로 작성
- 케밥 케이스 적용이 불가피하게 어려운 경우, 작업 전에 사용자에게 사유를 공유

## Accessibility & E2E Rules

- 모든 신규/수정 컴포넌트는 접근성(a11y)을 기본 요구사항으로 간주하고, 시맨틱 마크업과 키보드 조작 가능성(탭 이동, Enter/Space 동작, 포커스 표시)을 보장
- 아이콘 전용 버튼, 입력 요소, 동적 UI에는 접근 가능한 이름(`aria-label`, `label`, `aria-labelledby` 등)을 명시하고, placeholder를 라벨 대체 수단으로 사용하지 않음
- E2E는 Playwright CLI 기준으로 운영하므로, DOM 구조는 `getByRole`/`getByLabel`/`getByText` 기반 선택이 가능하도록 예측 가능하고 의미적으로 작성
- 상호작용 컴포넌트(메뉴, 다이얼로그, 탭, 검색, 토글, 드래그 핸들 등) 변경 시 Playwright E2E 시나리오를 함께 추가하거나 기존 테스트를 갱신

## Worktree Naming Rules

- 기본 형식은 `type/detail`
- `type`은 `feat|fix|refactor|perf|docs|test|chore|ci|build|revert|spike` 중 하나만 허용
- `detail`은 영문 소문자 케밥 케이스(`kebab-case`)로 작성
- `detail`은 1~5단어 권장, 공백/한글/대문자/특수문자 금지
- 전체 길이는 40자 이내 권장
- 같은 목적의 worktree를 다시 만들 때는 suffix로 `-v2`, `-v3` 사용

### Examples

- `feat/i18n`
- `fix/ranking-duplication`
- `docs/readme-cleanup`
- `spike/cache-strategy-v2`

## Worktree Location Rules

- worktree는 프로젝트 루트 하위 `worktrees/` 디렉토리에서만 관리
- 기본 경로 형식은 `worktrees/type/detail`
- 예: `worktrees/feat/share-module`, `worktrees/fix/ranking-duplication`
- worktree 이동/생성 후 `git worktree list`로 실제 경로를 반드시 확인
- 브랜치명은 `codex/type/detail` 형식을 권장

## Local Squash Merge Rules

- 로컬 `main` 반영은 기본적으로 `squash merge`를 사용
- `squash merge` 전에는 `main` 최신 상태(`fetch` 후 `ff-only`)를 확인
- 작업 브랜치에 `main`을 먼저 반영해 충돌을 조기 발견
- 선반영 후 테스트/빌드 통과 시에만 `squash merge` 진행
- 브랜치명이 로그에 남는 merge commit 방식(`--no-ff`)은 기본 금지
- `main`의 최종 커밋 메시지는 반드시 Commit Message Rules 준수
- 원격 `push`는 사용자 지시가 있을 때만 수행

### Standard Flow (Local Only)

```bash
# 1) 작업 브랜치에서 변경 커밋
git add -A
git commit -m "fix(scope):요약"

# 2) main 최신화
git checkout main
git fetch origin
git merge --ff-only origin/main

# 3) 작업 브랜치에 main 선반영(충돌 조기 발견)
git checkout <work-branch>
git merge main

# 4) 테스트/빌드 확인
npm test
npm run build

# 5) 문제 없으면 main에서 squash merge
git checkout main
git merge --squash <work-branch>

# 6) main에 최종 커밋
git commit -m "fix(scope):요약"
```
