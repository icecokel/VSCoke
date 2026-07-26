# Blog P0 Hardening Design

**Goal:** 만료된 블로그 이미지가 외부 요청 없이 안내 카드로 표시되게 하고, P0로 분류한 기술 글의 위험하거나 오래된 안내를 현재 기준으로 바로잡는다.

## 범위

### 만료 이미지

- 대상은 `apps/web/src/posts`의 `https://blog.kakaocdn.net/` 이미지 URL 105개다.
- 기존 글 데이터의 원격 URL은 보존한다. 과거 원문 기록을 유지하고 개별 URL 105개를 수정하지 않는다.
- 렌더링 시 해당 URL을 감지하면 네트워크 요청을 하지 않고, 로컬 아이콘과 한국어 안내 문구로 구성한 `PostLegacyImageNotice`를 표시한다.
- 안내 카드는 원본 스크린샷을 재현하거나 사실처럼 보이는 AI 이미지를 만들지 않는다. 본문 명령과 설명을 우선하도록 알려야 한다.
- 다른 로컬·외부 이미지는 현재 `PostImage` 동작을 유지한다.

### 기술 글 업데이트

다음 여섯 글만 본문과 메타데이터를 수정한다.

| 글                               | 변경 기준                                                                                                                                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev/react-nextjs-security-2025` | 날짜를 2025-12-11로 정정하고, CVE-2025-55182와 후속 RSC 취약점의 관계를 명확히 한다. 특정 구형 패치 버전 대신 `npx fix-react2shell-next`와 의존성 확인·검증 절차를 안내한다.                       |
| `dev/centos8-mysql-install`      | CentOS Linux 8 지원 종료를 전면에 표시한다. 데이터베이스 이름은 식별자 백틱, 계정은 특정 호스트, 권한은 필요한 DML만 부여하는 예제로 바꾼다. `%`, `GRANT ALL`, `FLUSH PRIVILEGES` 권장은 제거한다. |
| `dev/typescript-express-login-1` | 환경 변수 secret, 운영용 세션 저장소, `saveUninitialized: false`, `httpOnly`·`sameSite`·운영 HTTPS cookie 설정을 설명한다.                                                                         |
| `dev/typescript-express-login-2` | 요청 본문만으로 로그인 상태를 만들지 않는다. 비밀번호 검증 후 `req.session.regenerate`로 세션 ID를 교체하고, 세션에는 최소 식별자만 저장한다.                                                      |
| `dev/typescript-express-login-3` | cookie `maxAge`가 밀리초임을 명시하고 14일 계산을 정정한다. remember-me는 인증 이후 선택적으로 적용하며 로그아웃 시 세션 파기를 포함한다.                                                          |
| `dev/typescript-express-setup`   | Node 14·전역 nodemon·`Set-ExecutionPolicy Unrestricted`를 제거한다. 최신 LTS, 로컬 `tsx watch`, strict TypeScript, 빌드와 실행 scripts를 사용한다.                                                 |

## 구현 설계

1. `apps/web/src/components/blog/blog-post-elements.tsx`에 순수 URL 판별 함수와 `PostLegacyImageNotice`를 둔다.
2. `PostImage`는 Kakao CDN URL일 때 `PostLegacyImageNotice`를 반환하고, 그 밖에는 기존 native `img`를 반환한다.
3. 안내 카드에는 기존 `Icon` 컴포넌트의 이미지 비활성 아이콘과 로컬 텍스트를 사용한다. 포스트 본문이 모두 한국어이므로, 한국어 원문을 재현하는 현재 블로그 범위에서 같은 한국어 문구를 사용한다.
4. 위 여섯 포스트는 기존 `BlogPostDocument` 노드 형식을 유지하며, 위험한 코드 블록·문장·메타데이터만 필요한 범위로 바꾼다.
5. `apps/web/src/components/blog/blog-post-elements.spec.tsx`와 기존 블로그 테스트에 회귀 검증을 추가한다. URL 판별, 로컬 이미지 보존, 보안 글 게시일, 금지된 위험 예제의 부재를 검증한다.

## 검증 기준

- Kakao CDN URL은 브라우저에서 요청되지 않고 안내 카드만 렌더링된다.
- 로컬 이미지와 일반 HTTPS 이미지는 기존 `img`로 렌더링된다.
- P0 글에 `Set-ExecutionPolicy Unrestricted`, `saveUninitialized: true`, `%` 호스트, `GRANT ALL`, 잘못된 데이터베이스 문자열 인용이 남지 않는다.
- React 보안 글은 2025-12-11 날짜와 후속 취약점 점검 절차를 포함한다.
- 웹 단위 테스트, lint, type check를 통과한다. UI 영향은 기존 블로그 페이지 Playwright 시나리오로 확인한다.

## 비범위

- 원본 스크린샷의 복원, AI 스크린샷 생성, P1·P2 글 수정, 글별 OG 이미지, H1 계층, 수정일 메타데이터는 이 작업에 포함하지 않는다.
