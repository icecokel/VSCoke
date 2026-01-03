---
trigger: always_on
---

# AI Assistant Rules for VSCoke

## 1. Project Context

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Localisation**: next-intl (`messages/` directory)
- **UI Components**: shadcn/ui
- **Phaser**: 3.90+

## 2. Project-Specific Rules

1. **Routing Policy**
   - **Link, useRouter 사용 지양**: 커스텀 라우팅 로직을 위해 Next.js의 기본 `Link`나 `useRouter` 대신 `CustomLink`와 `useCustomRouter`를 적극 활용한다.
2. **Components**
   - 서버 컴포넌트와 클라이언트 컴포넌트(`"use client"`)를 명확히 구분한다.
