# VSCoke Blog

MDX 기반 블로그 시스템을 구축한 Next.js 프로젝트입니다.

## 📋 프로젝트 개요

이 프로젝트는 MDX(Markdown + JSX)를 활용한 정적 블로그 시스템으로, 카테고리별로 구성된 포스트를 관리하고 표시합니다. Next.js 15의 App Router를 사용하여 구현되었습니다.

## 🏗️ 기술 스택

- **Framework**: Next.js 15.4.6
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.1.12 + @tailwindcss/typography
- **Content**: MDX (@next/mdx, @mdx-js/loader)
- **Content Processing**: gray-matter (frontmatter 파싱)
- **Font**: Geist Sans/Mono

## 📁 프로젝트 구조

```
vscoke/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # 루트 레이아웃
│   │   ├── page.tsx            # 홈페이지
│   │   └── blog/
│   │       ├── page.tsx        # 블로그 목록 페이지
│   │       └── [...slug]/
│   │           └── page.tsx    # 동적 블로그 상세 페이지
│   └── lib/
│       └── posts.ts            # 포스트 관련 유틸리티 함수
├── posts/                      # MDX 포스트 디렉토리
│   ├── frontend/
│   │   └── react/
│   ├── backend/
│   │   └── nodejs/
│   └── community/
│       └── general/
├── mdx-components.tsx          # MDX 컴포넌트 설정
├── next.config.ts              # Next.js 설정 (MDX 지원)
└── tailwind.config.ts          # Tailwind CSS 설정
```

## ✨ 주요 기능

### 1. MDX 기반 포스트 시스템
- **Frontmatter 지원**: 제목, 날짜, 게시 상태 등 메타데이터 관리
- **카테고리별 구성**: frontend, backend, community 등 계층적 폴더 구조
- **동적 라우팅**: `[...slug]` 를 통한 중첩된 경로 지원

### 2. 포스트 필터링
- **게시 상태 필터링**: `published: false` 포스트 비공개 처리
- **날짜 기반 필터링**: 미래 날짜 포스트 자동 숨김
- **최신순 정렬**: 포스트 목록을 날짜 기준으로 정렬

### 3. 정적 생성 (SSG)
- **generateStaticParams**: 빌드 시점에 모든 포스트 경로 생성
- **generateMetadata**: 포스트별 메타데이터 동적 생성
- **성능 최적화**: 정적 사이트 생성으로 빠른 로딩

### 4. 반응형 디자인
- **Tailwind CSS**: 유틸리티 기반 스타일링
- **Typography 플러그인**: MDX 컨텐츠 최적화된 타이포그래피
- **다크모드 지원**: 자동 다크모드 감지

## 🚀 시작하기

### 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm run dev
```

### 빌드
```bash
npm run build
npm start
```

## 📝 포스트 작성

### 포스트 파일 구조
```
posts/
├── [category]/
│   └── [subcategory]/
│       └── post-title.mdx
```

### Frontmatter 예시
```yaml
---
title: 'React 시작하기'
date: '2025-08-25'
published: true
---
```

### MDX 예시
```mdx
---
title: 'First React Post'
date: '2025-08-25'
published: true
---

# Hello React

This is my first post about React.

```javascript
console.log('Hello, World!');
```
```

## 🔧 주요 설정

### Next.js 설정 (next.config.ts)
- MDX 파일 확장자 지원 (`md`, `mdx`)
- remark-frontmatter 플러그인으로 frontmatter 처리

### Tailwind 설정
- Typography 플러그인으로 MDX 컨텐츠 스타일링
- 반응형 디자인 지원

## 📊 현재 상태

- ✅ 기본 블로그 시스템 구현 완료
- ✅ MDX 포스트 렌더링 작동
- ✅ 카테고리별 포스트 관리
- ✅ 정적 생성 및 메타데이터 처리
- ⚠️ Next.js params 관련 개발 서버 경고 존재 (기능적으로는 정상 작동)

## 🐛 알려진 이슈

### Next.js params 정적 분석 오류
- **증상**: 개발 서버에서 `params` 관련 경고 메시지 출력
- **영향**: 기능적으로는 정상 작동하나 개발 경험 저해
- **상태**: Next.js 정적 분석기의 과도한 경고로 추정, 향후 버전에서 해결 예정

자세한 내용은 `TODO.md` 참조

## 📈 향후 계획

1. **컨텐츠 확장**: 더 많은 카테고리와 포스트 추가
2. **기능 개선**: 태그 시스템, 검색 기능 추가
3. **UI/UX 개선**: 네비게이션, 댓글 시스템 등
4. **성능 최적화**: 이미지 최적화, SEO 개선

## 🤝 기여

이슈나 개선사항이 있다면 언제든 기여해주세요!

## 📄 라이선스

이 프로젝트는 개인 블로그 프로젝트입니다.