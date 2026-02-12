# Local Agent Rules

## Commit Message Rules

- 제목 형식은 `type(scope):요약` 또는 `type:요약`
- 허용 타입은 `feat|fix|refactor|perf|docs|test|chore|ci|build|revert`
- `:` 뒤에는 공백 없이 바로 요약을 작성
- 제목 길이는 50자 이내
- 제목 끝에 `.`, `!`, `?`, `。` 같은 문장부호 금지
- 요약에는 한글 포함 필수
- 예외 허용: `Merge ...`, `Revert ...`, `fixup! ...`, `squash! ...`

### Examples

- `feat(auth):구글토큰검증추가`
- `fix:랭킹중복노출수정`

## File Naming Rules

- 새 파일 생성은 기본적으로 케밥 케이스(`kebab-case`)로 작성
- 케밥 케이스 적용이 불가피하게 어려운 경우, 작업 전에 사용자에게 사유를 공유
