# 프로젝트 일관성 개선 계획

**작성일**: 2025-12-11
**프로젝트**: VSCoke Portfolio & Blog

## 목차

1. [파일 확장자 통일](#1-파일-확장자-통일)
2. [파일 구조 일관성](#2-파일-구조-일관성)
3. [TypeScript 인터페이스 네이밍](#3-typescript-인터페이스-네이밍)
4. [Import 별칭 사용 일관성](#4-import-별칭-사용-일관성)
5. [Vercel 배포 설정](#5-vercel-배포-설정)

---

## 1. 파일 확장자 통일

### 현재 상태
- `src/styles/breakPoints.js` - JavaScript
- `src/styles/break-points.ts` - TypeScript (중복)
- `src/styles/keyFrames.js` - JavaScript
- `src/styles/colors.ts` - TypeScript

### 문제점
- breakPoints가 `.js`와 `.ts` 두 파일로 중복 존재
- styles 디렉토리 내 파일 확장자가 혼재 (js, ts)
- 프로젝트가 TypeScript 기반인데 일부 파일만 JavaScript 사용

### 개선 방향
1. `src/styles/breakPoints.js` 삭제 (break-points.ts로 통일)
2. `src/styles/keyFrames.js`를 `src/styles/key-frames.ts`로 변환 및 이름 변경
3. 모든 스타일 관련 파일을 TypeScript로 통일
4. 파일명을 케밥케이스로 통일 (breakPoints → break-points, keyFrames → key-frames)

### 우선순위
**HIGH** - 중복 파일은 혼란을 야기하고 빌드 크기 증가

---

## 2. 파일 구조 일관성

### 현재 상태
**일관된 구조 (디렉토리):**
- `src/components/base-ui/button/` (index.tsx + type.ts)
- `src/components/base-ui/icon/` (index.tsx + types.ts)
- `src/components/base-ui/snack-bar/` (index.tsx + hooks/ + context/ + type/)

**비일관 구조 (단일 파일):**
- `src/components/base-ui/avatar.tsx`
- `src/components/base-ui/container.tsx`
- `src/components/intro.tsx`
- `src/components/not-found.tsx`

### 문제점
- 같은 base-ui 내에서도 구조가 다름
- 단일 파일과 디렉토리 구조가 혼재
- type.ts vs types.ts 네이밍 불일치

### 개선 방향
두 가지 옵션:

**옵션 A (권장)**: 복잡도가 낮은 컴포넌트는 단일 파일 유지
- 단순 컴포넌트: 단일 파일 (avatar.tsx, container.tsx)
- 복잡 컴포넌트: 디렉토리 구조 (button/, snack-bar/)

**옵션 B**: 모든 컴포넌트를 디렉토리 구조로 통일
- 일관성은 높지만 과도한 구조화 우려

**타입 파일 네이밍**:
- `type.ts` → `types.ts`로 통일 (복수형)

### 우선순위
**MEDIUM** - 기능에는 영향 없으나 유지보수성 향상

---

## 3. TypeScript 인터페이스 네이밍

### 현재 상태
```typescript
// src/components/base-ui/container.tsx
interface IContainer extends HtmlHTMLAttributes<HTMLDivElement>

// src/hooks/use-explorer.tsx
export interface ITree

// src/contexts/history-context.tsx
export interface IHistoryItem
```

### 문제점
- `I` prefix 사용 (Hungarian notation)
- 현대 TypeScript 스타일 가이드와 불일치
- React/Next.js 생태계에서는 일반적으로 사용하지 않음

### 개선 방향
```typescript
// Before
interface IContainer
interface ITree
interface IHistoryItem

// After
interface ContainerProps
interface TreeNode
interface HistoryItem
```

**네이밍 규칙**:
- Props 인터페이스: `ComponentNameProps`
- 데이터 모델: 의미있는 이름 (TreeNode, HistoryItem)
- I prefix 제거

### 우선순위
**LOW** - 기능적 영향 없음, 점진적 개선 가능

---

## 4. Import 별칭 사용 일관성

### 현재 상태
```typescript
// src/app/package/page.tsx
import BaseText from "@ui/text";  // @ui alias

// src/components/base-ui/container.tsx
import { breakPoints } from "@/styles/break-points";  // @/ alias

// src/hooks/use-explorer.tsx
import useSortByKey from "./use-sort-by-key";  // 상대경로
import { ExplorerContext } from "@/contexts/app-provider";  // @/ alias
```

### 문제점
- `@ui` alias와 `@/` alias 혼용
- 상대경로와 절대경로 혼용
- tsconfig.json paths 설정 확인 필요

### 개선 방향
1. tsconfig.json paths 설정 확인 및 통일
2. 다음 규칙 적용:
   - 같은 디렉토리: 상대경로 (`./`)
   - 다른 디렉토리: 절대경로 (`@/`)
   - `@ui` 같은 특수 alias는 `@/components/base-ui`로 통일

```typescript
// After
import BaseText from "@/components/base-ui/text";
import { breakPoints } from "@/styles/break-points";
import useSortByKey from "./use-sort-by-key";
import { ExplorerContext } from "@/contexts/app-provider";
```

### 우선순위
**MEDIUM** - 코드 가독성 및 유지보수성 향상

---

## 5. Vercel 배포 설정

### 현재 상태
```
Error: Node.js Version "18.x" is discontinued and must be upgraded.
Please set Node.js Version to 24.x in your Project Settings.
```

### 문제점
- Vercel에서 Node.js 18 지원 종료
- 배포 실패

### 개선 방향
1. `package.json`에 engines 필드 추가:
```json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

2. Vercel 프로젝트 설정에서 Node.js 버전을 24.x로 변경
   - Vercel Dashboard → Project Settings → General → Node.js Version

3. `.nvmrc` 파일 생성 (선택사항):
```
20
```

### 우선순위
**HIGH** - 배포 차단 이슈

---

## 적용 순서

### Phase 1: 긴급 (배포 차단)
1. ✅ Vercel Node.js 버전 업데이트
2. ✅ package.json engines 필드 추가

### Phase 2: 중요 (혼란 제거)
3. ✅ breakPoints.js 중복 파일 삭제
4. ✅ keyFrames.js → key-frames.ts 변환
5. ✅ tailwind.config.ts import 경로 수정

### Phase 3: 개선 (코드 품질)
6. ✅ Import 별칭 통일
7. ✅ Type 파일 네이밍 통일 (type.ts → types.ts)

### Phase 4: 선택 (점진적 개선)
8. ⏸️ Interface I prefix 제거 (리팩토링 시)
9. ⏸️ 파일 구조 통일 (필요시)

---

## 체크리스트

### 파일 정리
- [ ] `src/styles/breakPoints.js` 삭제
- [ ] `src/styles/keyFrames.js` → `src/styles/key-frames.ts` 변환
- [ ] `tailwind.config.ts` import 경로 업데이트

### 타입 파일 통일
- [ ] `src/components/base-ui/button/type.ts` → `types.ts`
- [ ] `src/components/base-ui/icon/types.ts` 유지
- [ ] `src/components/base-ui/text/type.ts` → `types.ts`
- [ ] `src/components/base-ui/snack-bar/type/type.ts` → `types.ts`

### Import 별칭 통일
- [ ] `@ui` alias 제거, `@/components/base-ui`로 변경
- [ ] tsconfig.json paths 설정 확인

### 배포 설정
- [ ] package.json engines 추가
- [ ] Vercel Node.js 버전 24.x 설정
- [ ] .nvmrc 파일 생성 (선택)

---

## 참고사항

### TypeScript 스타일 가이드
- [TypeScript Deep Dive - Interface Naming](https://basarat.gitbook.io/typescript/styleguide#interface)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)

### Next.js 베스트 프랙티스
- [Next.js Documentation - Project Organization](https://nextjs.org/docs/app/building-your-application/routing/colocation)

### Node.js 버전
- [Node.js Release Schedule](https://github.com/nodejs/release#release-schedule)
- [Vercel Node.js Runtime](https://vercel.com/docs/functions/runtimes/node-js)
