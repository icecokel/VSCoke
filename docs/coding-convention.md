# VSCoke 코딩 컨벤션

## 1. 문서 지위와 적용 범위

이 문서는 VSCoke 저장소의 코딩 컨벤션에 대한 유일한 정책 원본이다. 코드, 테스트,
스크립트, 설정 파일을 작성·수정·리뷰할 때 모두 적용한다.

- `AGENTS.md`는 이 문서의 규칙을 복제하지 않고 전용 스킬만 호출한다.
- `.agents/skills/follow-vscoke-coding-convention/SKILL.md`는 작업 절차만 정의하고 상세
  규칙은 이 문서를 읽어 적용한다.
- Prettier, ESLint, TypeScript, Husky 설정은 이 문서를 기계적으로 검증하는 실행 설정이다.
- 과거 계획서와 작업 기록에 남아 있는 규칙은 현재 컨벤션의 근거로 사용하지 않는다.
- 이 문서와 실행 설정이 충돌하면 임의로 한쪽을 무시하지 말고 같은 변경에서 정합성을
  맞춘다.

## 2. 기본 원칙

- 기존 코드의 구조와 공개 계약을 먼저 확인하고 필요한 범위만 변경한다.
- 중복 구현보다 기존 모듈, 훅, 서비스, 공통 컴포넌트 재사용을 우선한다.
- 함수와 컴포넌트는 한 가지 책임을 가지며, 이름으로 의도를 드러낸다.
- 주석은 코드가 하는 일을 반복하지 않고 결정 이유, 제약, 예외를 설명할 때만 작성한다.
- 식별자는 영어로 작성한다. 새 주석과 기술 문서는 기본적으로 한국어로 작성하되,
  외부 규격명, 인용문, 생성 파일은 원문의 언어를 유지할 수 있다.
- 디버깅용 `console.log`, 사용하지 않는 코드, 주석 처리한 코드는 완료 전에 제거한다.
- 기존 파일을 컨벤션에 맞추기 위한 목적만으로 작업 범위 밖 코드를 일괄 수정하지 않는다.

## 3. 이름과 파일

### 파일과 디렉터리

- 프로젝트가 새로 만드는 파일과 디렉터리는 `kebab-case`를 사용한다.
- 테스트 파일은 대상 이름에 `.spec.ts` 또는 `.spec.tsx`를 붙인다. 웹 E2E는
  `apps/web/tests/e2e/<behavior>.spec.ts`에 둔다.
- Next.js의 `page.tsx`, `layout.tsx`, `route.ts`, NestJS의 `*.controller.ts`,
  `*.service.ts`, `*.module.ts`, 마이그레이션 파일처럼 프레임워크가 요구하는 이름은
  예외다.
- 외부에서 가져온 코드나 기존 대규모 런타임의 파일명을 유지해야 하면 이유를 작업 결과에
  남긴다.

### 코드 식별자

- 변수와 함수는 `camelCase`를 사용한다.
- React 컴포넌트, 클래스, 타입, 인터페이스, enum은 `PascalCase`를 사용한다.
- 실제 전역 상수나 프로토콜 상수는 `UPPER_SNAKE_CASE`를 사용할 수 있다. 그 외 `const`
  값은 `camelCase`를 사용한다.
- boolean은 가능하면 `is`, `has`, `can`, `should`처럼 상태가 드러나는 접두사를 사용한다.
- 축약어보다 도메인 의미가 드러나는 이름을 우선한다.

## 4. TypeScript와 함수

- 각 패키지의 `tsconfig.json`에 정의된 strict 검사를 유지한다.
- 공개 함수, 컴포넌트 props, API 경계에는 의도가 드러나는 타입을 명시하고 내부의 명백한
  값은 타입 추론을 활용한다.
- `any` 대신 `unknown`과 타입 좁히기를 우선한다. `any`, 타입 단언, lint/TypeScript 억제가
  불가피하면 가장 좁은 범위에 적용하고 이유를 남긴다.
- union과 조합에는 `type`, 확장 가능한 객체 계약에는 `interface`를 우선하되 기존 파일의
  일관성을 존중한다.
- 새 React 컴포넌트와 모듈 수준 함수는 화살표 함수를 기본으로 한다. 호이스팅이 필요한
  순수 함수, Next.js 예약 export, NestJS 클래스 메서드, 기존 파일 일관성이 더 중요한
  경우에는 함수 선언 또는 메서드 문법을 사용한다.
- 재사용 모듈은 named export를 우선한다. Next.js의 page/layout과 외부 도구가 default
  export를 요구하는 경우는 예외다.

## 5. 모노레포 경계

- 웹 코드는 `apps/web`, API 코드는 `apps/api`, 양쪽에서 공유할 결정론적 도메인 로직은
  `packages`에서 관리한다.
- 웹에서 API 소스 코드를 직접 import하지 않는다.
- API 계약 흐름은 다음을 유지한다.

  ```text
  apps/api controller/dto
  -> apps/api/openapi.json
  -> apps/web/src/types/api.d.ts
  -> web service
  -> page/component
  ```

- API controller나 DTO 계약을 변경하면 `pnpm generate:types`를 실행하고 생성된 OpenAPI와
  웹 타입을 함께 반영한다.
- 웹에서는 `@/` 경로 별칭을 우선하고, 같은 디렉터리의 짧은 참조에만 상대 경로를 사용한다.
- 상세 구조와 런타임 책임은 `docs/vscoke-monorepo-concept.md`를 따른다.

## 6. 웹 프런트엔드

- Server Component를 기본으로 하고 상태, 브라우저 API, 이벤트 처리가 필요할 때만
  `"use client"` 경계를 추가한다.
- 내부 로케일 라우팅은 기본 `Link`와 `useRouter`를 직접 사용하기 전에 `CustomLink`와
  `useCustomRouter`를 우선 검토한다.
- 사용자에게 보이는 문구는 `next-intl` 메시지 파일에서 관리하고 컴포넌트에 새 문자열을
  하드코딩하지 않는다.
- 공통 UI는 `apps/web/src/components/ui`의 shadcn/ui primitive를 우선 재사용한다.
- 도메인 컴포넌트는 feature 또는 `apps/web/src/components` 아래에 두고 공통 primitive를
  조합한다.
- 단일 화면 스타일은 shadcn 원본을 수정하지 않고 호출부 `className` 또는 도메인 래퍼에
  둔다.
- 새 shadcn 컴포넌트는 `apps/web/components.json`과 기존 UI 구현 방식을 따른다.
- 색상, 간격, radius는 기존 CSS 변수와 Tailwind 토큰을 우선 사용한다.

## 7. API 백엔드

- NestJS의 module, controller, service, DTO 책임을 분리한다.
- 요청 입력은 DTO와 `class-validator`로 검증하고, controller는 전송 계층 처리에 집중한다.
- 비즈니스 로직과 데이터 접근은 controller에 직접 쌓지 않는다.
- DB 스키마 변경은 TypeORM migration으로 관리하고 운영에서 synchronize에 의존하지 않는다.
- API 계약 변경 시 Swagger 설명, DTO, 테스트, 생성 OpenAPI와 웹 타입을 함께 갱신한다.
- 서버 로그는 Nest logger 또는 프로젝트의 Winston 경로를 사용하고 임시 `console.log`를
  남기지 않는다.

## 8. 테스트

- 동작 변경에는 정상 경로, 실패 경로, 경계 조건 중 회귀 위험에 맞는 테스트를 추가한다.
  고정된 테스트 개수보다 변경된 동작을 설명하는 검증을 우선한다.
- API 단위 테스트는 대상과 가까운 `*.spec.ts`, API E2E는 `apps/api/test`에 둔다.
- 웹 E2E의 상세 작성·실행 규칙은 `docs/playwright-cli-test-spec.md`를 따른다.
- 구현 세부사항보다 사용자가 관찰할 수 있는 결과와 공개 계약을 검증한다.
- 외부 API나 시간에 의존하는 테스트는 결정론적으로 제어하되 런타임 코드에 mock fallback을
  추가하지 않는다.

## 9. 포맷과 정적 검사

- 저장소 루트 Prettier 설정을 사용한다. 웹과 공통 코드는 100자 너비와 큰따옴표를,
  API 코드는 기존 형식을 보존하기 위해 80자 너비와 작은따옴표를 사용한다.
- 2칸 들여쓰기, 세미콜론, trailing comma를 사용한다. 단일 인자 화살표 함수의 괄호는
  웹과 공통 코드에서 생략하고 API에서 유지한다. 직접 맞추지 말고 Prettier 결과를 따른다.
- 웹은 Next.js Core Web Vitals와 TypeScript ESLint 규칙을 따른다.
- API는 type-aware TypeScript ESLint와 Prettier 검사를 따른다.
- lint나 type 오류를 억제해 통과시키기보다 원인을 해결한다.

## 10. Git과 작업 디렉터리

### 커밋 제목

- 형식은 `type(scope):요약` 또는 `type:요약`이다.
- 허용 type은 `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `ci`,
  `build`, `revert`다.
- `:` 뒤에 공백을 넣지 않고 한글이 포함된 자연스러운 요약을 작성한다.
- 제목은 50자 이내이며 `.`, `!`, `?`, `。`로 끝내지 않는다.
- Git이 생성한 `Merge`, `Revert`, `fixup!`, `squash!` 제목은 예외다.

예시:

- `feat(auth):구글 토큰 검증 추가`
- `fix:랭킹 중복 노출 수정`

### 브랜치와 worktree

- worktree 이름은 `type/detail`, 브랜치는 `codex/type/detail`을 사용한다.
- `type`은 커밋 type과 `spike` 중 하나를 사용하고 `detail`은 1~5단어의 영문
  `kebab-case`로 작성한다.
- worktree는 저장소의 `worktrees/type/detail` 아래에서만 관리한다.
- 같은 목적을 다시 만들면 `-v2`, `-v3` suffix를 사용한다.
- 로컬 `main` 반영은 최신 `main`을 작업 브랜치에 먼저 반영하고 검증한 다음 squash merge를
  기본으로 한다. 원격 push는 사용자 지시가 있을 때만 수행한다.

## 11. 완료 전 검증

변경 범위에 필요한 최소 검증을 저장소 루트에서 실행한다.

| 변경 범위          | 필수 검증                                                    |
| ------------------ | ------------------------------------------------------------ |
| 문서·설정          | 변경 파일 Prettier 검사와 관련 설정 검증                     |
| 웹 코드            | `pnpm lint:web`, `pnpm type:check:web`                       |
| API 코드           | `pnpm --filter @vscoke/api lint`, 관련 API 테스트            |
| 공유 battle 패키지 | `pnpm --filter @vscoke/poke-lounge-battle lint`, 관련 테스트 |
| API 계약           | `pnpm check:api-contract`                                    |
| 사용자 흐름·UI     | 관련 Playwright spec 또는 `pnpm e2e:smoke`                   |
| 통합 영향          | `pnpm build` 및 영향 범위 테스트                             |

실행하지 못한 검증이나 이미 알려진 실패가 있으면 완료 보고에 명시한다.

## 12. 예외와 변경 절차

- 프레임워크 제약, 생성 코드, 외부 소스 보존 등으로 예외가 필요하면 적용 전에 이유와
  범위를 밝힌다.
- 컨벤션을 변경할 때는 이 문서를 먼저 수정하고 관련 스킬, 실행 설정, hook이 여전히
  일치하는지 확인한다.
- 같은 규칙을 다른 `AGENTS.md`, 스킬, 에이전트 설정에 복제하지 않는다.
