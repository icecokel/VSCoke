# GA GTM Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional Google Tag Manager support to the VSCoke Next.js web app so GA4 can be connected through GTM without hard-coding IDs.

**Architecture:** The web app reads `NEXT_PUBLIC_GTM_ID` in the root App Router layout and renders a small GTM component only when the value is a valid `GTM-` container ID. GA4 itself is configured in the GTM console, keeping future analytics and marketing tag changes out of application deployments.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, `next/script`, Playwright E2E, Vercel environment variables.

---

## Requirements

- Connect GTM at the web app root so every locale route can load the same container.
- Keep the container ID out of source code and read it from `NEXT_PUBLIC_GTM_ID`.
- Render nothing when `NEXT_PUBLIC_GTM_ID` is empty or invalid.
- Use GTM for GA4 setup rather than adding both GTM and a separate direct `gtag.js` snippet.
- Document the current cost posture:
  - GA4 standard: free for this use case.
  - Web GTM standard: free for this use case.
  - GA/GTM 360: enterprise sales product, not needed here.
  - BigQuery export and server-side GTM can add Google Cloud costs.

## Official Cost Notes

- Google Analytics standard page says Google Analytics is available free of charge for customer journey and ROI measurement: `https://marketingplatform.google.com/about/analytics/`
- Google Tag Manager standard page says web tag management is available for free: `https://marketingplatform.google.com/about/tag-manager/`
- Google Tag Manager vs gtag.js Help says both GTM and gtag.js cost `Free`: `https://support.google.com/tagmanager/answer/7582054`
- Google Tag Manager 360 and Analytics 360 are positioned for larger enterprise needs and use `Talk to Sales`: `https://marketingplatform.google.com/about/tag-manager/compare/`, `https://marketingplatform.google.com/about/analytics-360/`
- Server-side GTM on Cloud Run can cost about `$45 /month` per server in Google's default Cloud Run configuration, and Google recommends at least 2 instances for outage risk reduction: `https://developers.google.com/tag-platform/tag-manager/server-side/cloud-run-setup-guide`
- GA4 BigQuery export can add BigQuery storage and query processing costs; streaming export adds `$0.05 per gigabyte` according to Analytics Help: `https://support.google.com/analytics/answer/9358801`

## File Structure

- Create: `apps/web/src/components/google-tag-manager.tsx`
  - Owns GTM ID validation and the script/noscript rendering.
  - Keeps root layout small.
- Create: `apps/web/tests/e2e/google-tag-manager.spec.ts`
  - Verifies that a configured GTM ID appears in the rendered app shell.
  - Stubs `googletagmanager.com` network calls so E2E does not depend on Google network availability.
- Modify: `apps/web/src/app/layout.tsx`
  - Imports and renders `GoogleTagManager` as the first child of `<body>`.
- Modify: `apps/web/.env.example`
  - Documents optional `NEXT_PUBLIC_GTM_ID`.
- Modify: `docs/deployment-and-env.md`
  - Adds the optional web environment variable and cost caution.

## Tasks

### Task 1: Add failing GTM E2E coverage

**Files:**

- Create: `apps/web/tests/e2e/google-tag-manager.spec.ts`

- [ ] **Step 1: Write the failing Playwright test**

Create `apps/web/tests/e2e/google-tag-manager.spec.ts` with this content:

```ts
import { expect, test } from "@playwright/test";

test.describe("Google Tag Manager", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("https://www.googletagmanager.com/**", async route => {
      await route.fulfill({
        status: 204,
        body: "",
      });
    });
  });

  test("NEXT_PUBLIC_GTM_ID 값이 있으면 GTM 스크립트와 noscript fallback을 렌더링한다", async ({
    page,
  }) => {
    await page.goto("/ko-KR");

    const html = await page.content();

    expect(html).toContain('id="google-tag-manager"');
    expect(html).toContain("GTM-E2ETEST");
    expect(html).toContain("https://www.googletagmanager.com/gtm.js?id=GTM-E2ETEST");
    expect(html).toContain("https://www.googletagmanager.com/ns.html?id=GTM-E2ETEST");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run from the repository root:

```bash
NEXT_PUBLIC_GTM_ID=GTM-E2ETEST pnpm --filter @vscoke/web e2e tests/e2e/google-tag-manager.spec.ts --project=chromium
```

Expected result:

```txt
FAIL tests/e2e/google-tag-manager.spec.ts
Expected substring: "id=\"google-tag-manager\""
```

- [ ] **Step 3: Commit the failing test**

```bash
git add apps/web/tests/e2e/google-tag-manager.spec.ts
git commit -m "test(web):GTM 연결 검증 추가"
```

### Task 2: Add the GTM component

**Files:**

- Create: `apps/web/src/components/google-tag-manager.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/google-tag-manager.tsx` with this content:

```tsx
import Script from "next/script";

const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/i;

type GoogleTagManagerProps = {
  containerId?: string;
};

const isGoogleTagManagerId = (containerId: string | undefined): containerId is string => {
  return typeof containerId === "string" && GTM_ID_PATTERN.test(containerId);
};

export const GoogleTagManager = ({ containerId }: GoogleTagManagerProps) => {
  if (!isGoogleTagManagerId(containerId)) {
    return null;
  }

  const encodedContainerId = encodeURIComponent(containerId);

  return (
    <>
      <Script id="google-tag-manager" strategy="afterInteractive">
        {`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${encodedContainerId}');
        `}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${encodedContainerId}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
};
```

- [ ] **Step 2: Run typecheck for the new component**

Run:

```bash
pnpm type:check:web
```

Expected result:

```txt
Exit code 0
```

### Task 3: Wire the component into the root layout

**Files:**

- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Import the component**

Add this import near the existing imports in `apps/web/src/app/layout.tsx`:

```tsx
import { GoogleTagManager } from "@/components/google-tag-manager";
```

- [ ] **Step 2: Render the component as the first body child**

Replace the current body block:

```tsx
<body>{children}</body>
```

with this block:

```tsx
<body>
  <GoogleTagManager containerId={process.env.NEXT_PUBLIC_GTM_ID} />
  {children}
</body>
```

- [ ] **Step 3: Run the GTM E2E test and verify it passes**

Run:

```bash
NEXT_PUBLIC_GTM_ID=GTM-E2ETEST pnpm --filter @vscoke/web e2e tests/e2e/google-tag-manager.spec.ts --project=chromium
```

Expected result:

```txt
1 passed
```

- [ ] **Step 4: Commit the implementation**

```bash
git add apps/web/src/components/google-tag-manager.tsx apps/web/src/app/layout.tsx
git commit -m "feat(web):GTM 환경변수 연결 추가"
```

### Task 4: Document environment variable and cost boundaries

**Files:**

- Modify: `apps/web/.env.example`
- Modify: `docs/deployment-and-env.md`

- [ ] **Step 1: Add the web env example**

Append this block to `apps/web/.env.example`:

```dotenv

# Optional. Google Tag Manager web container ID for GA4 and marketing tags.
# Example: GTM-ABCDEFG
NEXT_PUBLIC_GTM_ID=
```

- [ ] **Step 2: Add the deployment env table row**

In `docs/deployment-and-env.md`, under `### Web 환경 변수`, update the web environment table so it includes this row after `NEXT_PUBLIC_API_URL`:

```md
| `NEXT_PUBLIC_GTM_ID` | 선택 | Vercel web project | GA4/GTM 웹 컨테이너 ID. 없으면 태그를 렌더링하지 않음 |
```

The table should read:

```md
| 이름                  | 필수 | 위치               | 설명                                                  |
| --------------------- | ---- | ------------------ | ----------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | 필수 | Vercel web project | 브라우저에서 호출할 API 공개 URL                      |
| `NEXT_PUBLIC_GTM_ID`  | 선택 | Vercel web project | GA4/GTM 웹 컨테이너 ID. 없으면 태그를 렌더링하지 않음 |
| `AUTH_GOOGLE_ID`      | 필수 | Vercel web project | Google OAuth client id                                |
| `AUTH_GOOGLE_SECRET`  | 필수 | Vercel web project | Google OAuth client secret                            |
| `AUTH_SECRET`         | 필수 | Vercel web project | Auth.js session/signing secret                        |
| `AUTH_URL`            | 선택 | Vercel web project | 플랫폼이 URL을 추론하지 못할 때                       |
```

- [ ] **Step 3: Add the cost caution bullets**

In `docs/deployment-and-env.md`, under the web env `주의:` list, add these bullets after the two existing `NEXT_PUBLIC_` cautions:

```md
- `NEXT_PUBLIC_GTM_ID`에는 `GTM-`로 시작하는 웹 컨테이너 ID만 넣는다.
- 일반 GA4와 웹 GTM 연결은 무료 사용 범위다. Analytics 360, Tag Manager 360, BigQuery export, server-side GTM은 별도 비용이나 Google Cloud 과금이 생길 수 있다.
```

- [ ] **Step 4: Commit the documentation**

```bash
git add apps/web/.env.example docs/deployment-and-env.md
git commit -m "docs(web):GTM 환경변수 비용 정리"
```

### Task 5: Run final verification

**Files:**

- No direct edits.

- [ ] **Step 1: Run web typecheck**

```bash
pnpm type:check:web
```

Expected result:

```txt
Exit code 0
```

- [ ] **Step 2: Run web lint**

```bash
pnpm lint:web
```

Expected result:

```txt
Exit code 0
```

- [ ] **Step 3: Run the focused GTM E2E test**

```bash
NEXT_PUBLIC_GTM_ID=GTM-E2ETEST pnpm --filter @vscoke/web e2e tests/e2e/google-tag-manager.spec.ts --project=chromium
```

Expected result:

```txt
1 passed
```

- [ ] **Step 4: Run the web production build**

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:65535 NEXT_PUBLIC_GTM_ID=GTM-E2ETEST pnpm build:web
```

Expected result:

```txt
Exit code 0
```

- [ ] **Step 5: Review the diff**

```bash
git status --short
git diff --stat
git diff -- apps/web/src/components/google-tag-manager.tsx apps/web/src/app/layout.tsx apps/web/.env.example docs/deployment-and-env.md apps/web/tests/e2e/google-tag-manager.spec.ts
```

Expected result:

```txt
Only GTM integration, env documentation, and the focused E2E test are changed.
```

## Deployment Checklist

- [ ] Create or confirm a GTM web container in `https://tagmanager.google.com`.
- [ ] In GTM, create a Google tag using the GA4 measurement ID that starts with `G-`.
- [ ] Use the `Initialization - All pages` trigger for the Google tag in GTM.
- [ ] Publish the GTM container.
- [ ] Set `NEXT_PUBLIC_GTM_ID=GTM-...` in Vercel Production environment variables.
- [ ] Set the same value in Vercel Preview environment variables only if preview traffic should be measured.
- [ ] Redeploy Vercel after changing the environment variable.
- [ ] Verify the production page with Google Tag Assistant or GA4 Realtime after deployment.

## Out of Scope

- Creating the GA4 property in the Google Analytics UI.
- Creating the GTM container in the Google Tag Manager UI.
- Enabling BigQuery export.
- Enabling server-side GTM.
- Adding custom conversion events beyond default GA4 page view behavior.
