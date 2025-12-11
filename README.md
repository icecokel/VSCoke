# VSCoke

VS Code 스타일 인터페이스를 가진 개발자 포트폴리오 웹사이트입니다.

## 📋 프로젝트 개요

이 프로젝트는 VS Code의 UI/UX를 모티브로 한 개발자 포트폴리오 사이트로, 파일 탐색기, 메뉴바, 탭 시스템 등 VS Code의 주요 인터페이스 요소를 웹으로 구현했습니다.

## 🏗️ 기술 스택

- **Framework**: Next.js 15.5.7 (App Router)
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS 4.1.17 (Modern CSS, Zero-config)
- **UI Components**: Custom Base UI Components (Material Design)
- **Icons**: Google Material Symbols
- **Font**: Noto Sans KR

## 📁 프로젝트 구조

```
vscoke/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # 루트 레이아웃
│   │   ├── page.tsx            # 홈 페이지
│   │   ├── globals.css         # 전역 스타일 (Tailwind + 커스텀)
│   │   ├── profile/            # 프로필 페이지
│   │   ├── readme/             # README 페이지
│   │   └── package/            # Package.json 페이지
│   ├── components/
│   │   ├── base-ui/            # 재사용 가능한 UI 컴포넌트
│   │   │   ├── button/         # 버튼 컴포넌트
│   │   │   ├── icon/           # Material Symbols 아이콘
│   │   │   ├── modal/          # 모달/다이얼로그
│   │   │   ├── snack-bar/      # 토스트 알림
│   │   │   ├── slide/          # 슬라이드 애니메이션
│   │   │   ├── accordion/      # 아코디언
│   │   │   └── ...             # 기타 UI 컴포넌트
│   │   ├── sidebar/            # 사이드바 (탐색기, 검색)
│   │   ├── menubar/            # 상단 메뉴바
│   │   ├── history-tabs/       # 탭 시스템
│   │   └── profile/            # 프로필 컴포넌트
│   ├── contexts/               # React Context API
│   │   ├── app-provider.tsx    # 앱 전역 상태
│   │   └── history-context.tsx # 탭 히스토리 관리
│   ├── hooks/                  # 커스텀 훅
│   │   ├── use-boolean.ts      # Boolean 상태 관리
│   │   ├── use-history.ts      # 히스토리 관리
│   │   ├── use-short-cut.ts    # 키보드 단축키
│   │   └── ...
│   ├── models/                 # TypeScript 타입 정의
│   ├── utils/                  # 유틸리티 함수
│   └── styles/                 # 스타일 관련 (삭제됨 - v4로 통합)
├── next.config.ts              # Next.js 설정
└── postcss.config.mjs          # PostCSS 설정 (@tailwindcss/postcss)
```

## ✨ 주요 기능

### 1. VS Code 스타일 UI
- **파일 탐색기**: 계층적 파일 트리 네비게이션
- **메뉴바**: File, Help 메뉴 시스템
- **탭 시스템**: 히스토리 기반 탭 관리 (드래그 앤 드롭 지원)
- **사이드바**: Explorer, Search 탭 전환

### 2. Base UI 컴포넌트 시스템
- **15개 재사용 컴포넌트**: Button, Icon, Modal, Tooltip, Accordion 등
- **Material Design**: 일관된 디자인 언어
- **Compound Components**: Accordion.Summary, Menu.item 패턴
- **Portal 기반**: Modal, SnackBar 등

### 3. 애니메이션 시스템
- **Slide 컴포넌트**: 4방향 슬라이드 (up, down, left, right)
- **CSS Keyframes**: 커스텀 애니메이션 정의
- **Smooth Transitions**: 부드러운 인터랙션

### 4. 상태 관리
- **Context API**: 전역 상태 관리
- **localStorage**: 탭 히스토리 영구 저장
- **Custom Hooks**: 7개의 재사용 가능한 훅

### 5. 반응형 디자인
- **커스텀 브레이크포인트**: xs(0px), sm(600px), md(900px), lg(1200px), xl(1440px)
- **Mobile-first**: 모바일 우선 접근법
- **다크 테마**: VS Code 스타일 다크 컬러 스킴

## 🚀 시작하기

### 요구 사항
- **Node.js**: 20.0.0 이상
- **npm** 또는 **yarn**

### 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

### 빌드
```bash
npm run build
npm start
```

### 린트
```bash
npm run lint
```

## 🔧 주요 설정

### Tailwind CSS v4 설정 (globals.css)
```css
@import 'tailwindcss';

@theme {
  --color-gray-50: #d7d7d7;
  --color-blue-100: #9cdcfe;
  /* ... 커스텀 컬러 팔레트 */

  --breakpoint-sm: 600px;
  --breakpoint-md: 900px;
  /* ... 커스텀 브레이크포인트 */
}
```

**특징**:
- ✅ Zero-config (tailwind.config.ts 불필요)
- ✅ CSS 변수 기반 테마 시스템
- ✅ 빌드 속도 5배 향상
- ✅ Modern CSS (@property, color-mix 지원)

### PostCSS 설정 (postcss.config.mjs)
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

### Next.js 설정 (next.config.ts)
- React Strict Mode: 비활성화
- 원격 이미지: AWS S3, Notion 지원

## 📊 프로젝트 통계

- **컴포넌트**: 15개 Base UI + 다수 Feature 컴포넌트
- **커스텀 훅**: 7개
- **페이지**: 4개 (Home, Profile, Resume, README)
- **컬러 팔레트**: 11개 커스텀 컬러
- **빌드 시간**: ~1.3초 (Tailwind v4 최적화)

## 🎨 디자인 시스템

### 컬러 팔레트
```css
/* Gray Scale */
--color-gray-50 to --color-gray-900

/* Accent Colors */
--color-blue-100, --color-blue-300
--color-yellow-100, --color-yellow-200
--color-green-300
--color-beige-400
--color-red-400
```

### 브레이크포인트
```css
xs: 0px     /* Mobile */
sm: 600px   /* Tablet */
md: 900px   /* Desktop */
lg: 1200px  /* Large Desktop */
xl: 1440px  /* Extra Large */
```

## 🔒 보안

- ✅ **XSS 방지**: dangerouslySetInnerHTML 제거
- ✅ **타입 안전성**: TypeScript strict mode
- ✅ **안전한 렌더링**: Material Symbols 올바른 사용

## 📈 향후 계획

1. **기능 확장**:
   - [ ] 검색 기능 구현
   - [ ] 블로그/포스트 시스템 추가
   - [ ] Package.json 뷰어 컴포넌트 개발

2. **UI/UX 개선**:
   - [ ] 다크/라이트 모드 토글
   - [ ] 키보드 단축키 전체 구현 (Ctrl+P 등)
   - [ ] 애니메이션 성능 최적화

3. **성능 최적화**:
   - [ ] 이미지 최적화
   - [ ] Code splitting
   - [ ] SEO 개선

## 📜 변경 이력

### v0.2.0 (2025-12-11)
- ✨ **Tailwind CSS v4.1 마이그레이션**
  - 빌드 속도 38% 향상
  - Zero-config 설정
  - Modern CSS 기능 지원
- 🔒 **보안 개선**
  - Icon 컴포넌트 XSS 취약점 제거
  - Material Symbols 올바른 사용법 적용
- 🗑️ **파일 정리**
  - colors.ts, break-points.ts, key-frames.ts 제거
  - CSS 변수로 통합
  - 213줄 코드 감소

### v0.1.0 (Initial Release)
- 🎨 VS Code 스타일 UI 구현
- 🧩 Base UI 컴포넌트 시스템
- 📱 반응형 디자인
- 🎭 애니메이션 시스템

## 🤝 기여

이슈나 개선사항이 있다면 언제든 기여해주세요!

## 📄 라이선스

이 프로젝트는 개인 포트폴리오 프로젝트입니다.

---

**Built with ❤️ using Next.js 15 & Tailwind CSS v4**