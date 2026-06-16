---
trigger: always_on
---

# AI Assistant Rules for VSCoke

## 1. Project Context

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Localisation**: next-intl (`apps/web/messages/` directory)
- **UI Components**: shadcn/ui
- **Phaser**: 3.90+

## 2. Project-Specific Rules

1. **Routing Policy**
   - **Link, useRouter 사용 지양**: 커스텀 라우팅 로직을 위해 Next.js의 기본 `Link`나 `useRouter` 대신 `CustomLink`와 `useCustomRouter`를 적극 활용한다.
2. **Components**
   - 서버 컴포넌트와 클라이언트 컴포넌트(`"use client"`)를 명확히 구분한다.
   - 공통 UI 컴포넌트는 shadcn/ui를 커스텀해서 사용한다.
   - shadcn/ui primitive는 `apps/web/src/components/ui/` 아래에서 관리한다.
   - 버튼, 입력, 다이얼로그, 드롭다운, 툴팁, 시트, 사이드바 같은 공통 interaction 컴포넌트는 직접 새로 만들기 전에 기존 shadcn 기반 컴포넌트 재사용을 우선한다.
   - 도메인 전용 컴포넌트는 feature 또는 도메인 컴포넌트 디렉토리에 두고, 공통 primitive는 `components/ui`를 조합해서 구현한다.
   - 단일 화면 전용 스타일은 shadcn 원본 컴포넌트를 수정하기보다 호출부 `className` 또는 도메인 래퍼에서 처리한다.
   - 새 shadcn 컴포넌트를 추가할 때는 `apps/web/components.json` 설정과 기존 `components/ui` 구현 스타일을 따른다.
3. **API Integration**
   - API 관련 수정 작업 전, 반드시 `pnpm generate:types`를 실행하여 서버 API 스키마와 로컬 타입을 동기화한다.
