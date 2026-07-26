# Blog P0 Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 만료된 블로그 이미지가 외부 요청 없이 안내 카드로 표시되고, P0 기술 글의 위험하거나 오래된 안내가 현재 기준으로 교정된다.

**Architecture:** `PostImage`가 `blog.kakaocdn.net` URL만 로컬 안내 카드로 전환한다. 여섯 P0 글은 기존 `BlogPostDocument` 노드 구조를 유지하고 필요한 메타데이터·문장·코드 블록만 교정한다. 순수 URL 판별 함수와 정적 본문 검증으로 회귀를 막는다.

**Tech Stack:** Next.js 15, React 19, TypeScript, Node test runner via `tsx`, Tailwind CSS, Heroicons.

---

### Task 1: 만료 이미지 전환을 테스트로 고정한다

**Files:**

- Create: `apps/web/src/components/blog/blog-post-elements.spec.ts`
- Modify: `apps/web/src/components/blog/blog-post-elements.tsx`

- [ ] **Step 1: 실패하는 URL 판별 테스트를 작성한다**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { isLegacyBlogImageUrl } from "./blog-post-elements";

test("만료된 Kakao 블로그 이미지는 로컬 안내 카드 대상으로 판별한다", () => {
  assert.equal(isLegacyBlogImageUrl("https://blog.kakaocdn.net/dna/example/image.png"), true);
  assert.equal(isLegacyBlogImageUrl("/images/blog/og-fail.png"), false);
  assert.equal(isLegacyBlogImageUrl("https://example.com/image.png"), false);
});
```

- [ ] **Step 2: RED를 확인한다**

Run: `pnpm exec tsx --test apps/web/src/components/blog/blog-post-elements.spec.ts`

Expected: `isLegacyBlogImageUrl` export가 없어 실패한다.

- [ ] **Step 3: 판별 함수와 로컬 안내 카드를 구현한다**

```tsx
export const isLegacyBlogImageUrl = (src: string): boolean => {
  return src.startsWith("https://blog.kakaocdn.net/");
};

const PostLegacyImageNotice = ({ alt }: Pick<PostImageProps, "alt">) => (
  <div className="my-6 flex items-start gap-3 rounded-lg border border-gray-700 bg-gray-800/70 p-4 text-gray-200">
    <PhotoIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-yellow-200" />
    <div>
      <p className="m-0 font-semibold text-white">이전 스크린샷 안내</p>
      <p className="m-0 mt-1 text-sm leading-6">
        원본 스크린샷은 만료된 외부 링크라 표시하지 않습니다. 본문의 명령과 설명을 기준으로 진행해
        주세요.
      </p>
      {alt && <p className="m-0 mt-2 text-sm text-gray-400">설명: {alt}</p>}
    </div>
  </div>
);
```

`PostImage`는 legacy URL에서 위 카드를 반환하고, 다른 URL에는 기존 native `img`를 그대로 반환한다. 전역 `Icon` 종류를 넓히지 않고 `PhotoIcon`을 blog 요소에만 import한다.

- [ ] **Step 4: GREEN을 확인한다**

Run: `pnpm exec tsx --test apps/web/src/components/blog/blog-post-elements.spec.ts`

Expected: 1개 테스트가 통과한다.

### Task 2: P0 본문 회귀 검증을 추가한다

**Files:**

- Create: `apps/web/src/posts/blog-p0-hardening.spec.ts`
- Modify: `apps/web/src/posts/blog-post-registry.spec.ts`

- [ ] **Step 1: 실패하는 정적 본문 테스트를 작성한다**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readPost = (name: string) =>
  readFileSync(new URL(`./dev/${name}.tsx`, import.meta.url), "utf8");

test("P0 글에서 위험하거나 틀린 예제를 제거한다", () => {
  const mysql = readPost("centos8-mysql-install");
  const session = readPost("typescript-express-login-1");
  const setup = readPost("typescript-express-setup");

  assert.doesNotMatch(mysql, /CREATE DATABASE '사용할 DB 이름'/);
  assert.doesNotMatch(mysql, /'%' identified by/);
  assert.doesNotMatch(mysql, /grant all privileges/i);
  assert.doesNotMatch(session, /saveUninitialized: true/);
  assert.doesNotMatch(setup, /Set-ExecutionPolicy Unrestricted/);
});
```

`blog-post-registry.spec.ts`에는 `dev/react-nextjs-security-2025`의 날짜가 `2025-12-11`임을 검증한다.

- [ ] **Step 2: RED를 확인한다**

Run: `pnpm exec tsx --test apps/web/src/posts/blog-p0-hardening.spec.ts apps/web/src/posts/blog-post-registry.spec.ts`

Expected: unsafe source 문자열과 기존 `2025-02-18` 날짜로 실패한다.

### Task 3: React/Next.js 보안 글을 최신 대응 절차로 바꾼다

**Files:**

- Modify: `apps/web/src/posts/blog-post-registry.ts`
- Modify: `apps/web/src/posts/dev/react-nextjs-security-2025.tsx`

- [ ] **Step 1: 메타데이터를 교정한다**

날짜를 `2025-12-11`로 바꾸고, 설명을 `React Server Components 취약점 대응을 위해 영향을 확인하고 패치·검증하는 절차를 정리합니다.`로 바꾼다.

- [ ] **Step 2: 구형 고정 버전 대신 공식 대응 절차를 넣는다**

```bash
pnpm why next react react-dom
pnpm outdated next react react-dom
npx fix-react2shell-next
pnpm lint:web
pnpm type:check:web
pnpm build:web
```

`CVE-2025-55182`, `CVE-2025-55183`, `CVE-2025-55184`, `CVE-2025-67779`의 관계와 "설정만으로 우회할 수 없고 공식 권고 버전으로 올려야 한다"는 내용을 명시한다.

### Task 4: CentOS 8 MySQL 글을 지원 종료·최소 권한 기준으로 교정한다

**Files:**

- Modify: `apps/web/src/posts/blog-post-registry.ts`
- Modify: `apps/web/src/posts/dev/centos8-mysql-install.tsx`

- [ ] **Step 1: 지원 종료 경고를 가장 앞에 넣는다**

`CentOS Linux 8은 2021-12-31에 지원이 종료되었습니다. 새 서버는 지원 중인 운영체제를 사용하고, 이 글은 기존 환경을 이전·점검할 때만 참고하세요.`를 blockquote로 추가한다.

- [ ] **Step 2: SQL 예제를 최소 권한으로 교체한다**

```sql
CREATE DATABASE IF NOT EXISTS `app_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

CREATE USER 'app_user'@'10.0.0.25' IDENTIFIED BY '<strong-password>';

GRANT SELECT, INSERT, UPDATE, DELETE
  ON `app_db`.*
  TO 'app_user'@'10.0.0.25';
```

호스트는 애플리케이션 서버 IP 또는 좁은 네트워크로 제한하고, `FLUSH PRIVILEGES`는 `CREATE USER`·`GRANT` 후 불필요하다고 설명한다.

### Task 5: Express-session 연재를 안전한 인증 흐름으로 교체한다

**Files:**

- Modify: `apps/web/src/posts/dev/typescript-express-login-1.tsx`
- Modify: `apps/web/src/posts/dev/typescript-express-login-2.tsx`
- Modify: `apps/web/src/posts/dev/typescript-express-login-3.tsx`

- [ ] **Step 1: 1편의 세션 설정을 교체한다**

```ts
const isProduction = process.env.NODE_ENV === "production";

app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
);
```

`sessionStore`는 운영에서 Redis 또는 DB 기반 저장소여야 하며 기본 MemoryStore는 개발 전용이라고 적는다.

- [ ] **Step 2: 2편에서 인증 후 세션을 재발급한다**

```ts
const account = await accountRepository.findByEmail(email);
const isPasswordValid = account
  ? await passwordHasher.verify(account.passwordHash, password)
  : false;

if (!isPasswordValid) {
  return res.status(401).send({ error: "invalid_credentials" });
}

req.session.regenerate(error => {
  if (error) return next(error);
  req.session.userId = account.id;
  return req.session.save(saveError => {
    if (saveError) return next(saveError);
    return res.send({ result: true });
  });
});
```

세션에는 client가 보낸 프로필 값이 아니라 `userId`만 저장한다고 설명한다.

- [ ] **Step 3: 3편에서 remember-me와 로그아웃을 바로잡는다**

```ts
const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;
req.session.cookie.maxAge = isRemember ? fourteenDaysInMs : undefined;

req.session.destroy(error => {
  if (error) return next(error);
  res.clearCookie("sid");
  return res.status(204).end();
});
```

`maxAge`의 단위는 밀리초이며 remember-me는 인증 성공 뒤에만 적용한다고 명시한다.

### Task 6: TypeScript + Express 설정 글을 최신 LTS 방식으로 교체한다

**Files:**

- Modify: `apps/web/src/posts/dev/typescript-express-setup.tsx`

- [ ] **Step 1: 설치 명령을 현재 방식으로 바꾼다**

```bash
npm init -y
npm install express
npm install -D typescript tsx @types/express @types/node
npx tsc --init
```

- [ ] **Step 2: PowerShell 권한 완화와 전역 도구를 제거한다**

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

Node PATH 오류는 지원 중인 Node LTS 재설치 또는 공식 버전 관리 도구로 해결하도록 바꾸고, `Set-ExecutionPolicy Unrestricted`를 전부 제거한다.

### Task 7: 검증한다

**Files:**

- Modify: Tasks 1–6의 파일만

- [ ] **Step 1: focused test를 실행한다**

Run: `pnpm exec tsx --test apps/web/src/components/blog/blog-post-elements.spec.ts apps/web/src/posts/blog-p0-hardening.spec.ts apps/web/src/posts/blog-post-registry.spec.ts`

Expected: 모든 테스트가 통과한다.

- [ ] **Step 2: 웹 검증을 실행한다**

Run: `pnpm test:web && pnpm lint:web && pnpm type:check:web`

Expected: 각 명령이 exit 0이다.

- [ ] **Step 3: 블로그 UI를 확인한다**

Run: `pnpm --filter @vscoke/web e2e tests/e2e/visual-regression.spec.ts --project=chromium`

Expected: 블로그 시나리오가 Kakao CDN 요청 없이 통과한다.

- [ ] **Step 4: 최종 diff를 점검한다**

Run: `git diff --check && git diff -- apps/web/src/components/blog apps/web/src/posts apps/web/messages`

Expected: 공백 오류가 없고 P0 범위 변경만 보인다. 현재 worktree에 사용자의 미커밋 변경이 있으므로 커밋하지 않는다.
