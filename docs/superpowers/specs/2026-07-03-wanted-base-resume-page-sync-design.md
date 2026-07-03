# Wanted Base Resume Page Sync Design

## Goal

VSCoke 이력서 페이지를 Wanted 베이스 이력서 `https://www.wanted.co.kr/cv/AwYACgsDBAJPBAQCBAULB0tE`의 현재 내용과 맞춘다.

## Source Of Truth

- Wanted 베이스 이력서 현재 저장 내용
- 로컬 기준 문서 `/Users/smlee/Documents/resume/docs/base-resume-final-v22-r15-2026-07-01.md`
- 이력서 작성 기준 `/Users/smlee/Documents/resume/docs/resume-writing-concept-v7-2026-06-30.md`

## Scope

- `apps/web/messages/ko-KR.json`의 이력서 소개, 경력 요약, 프로젝트 문구를 Wanted 기준으로 바꾼다.
- `apps/web/messages/en-US.json`은 같은 구조와 의미를 유지하는 자연스러운 영어 문장으로 맞춘다.
- `apps/web/src/constants/resume-data.json`은 Wanted에 노출된 경력 항목 순서와 노출 범위에 맞춘다.
- `apps/web/resume-detail/*.mdx` 상세 문서는 요약 페이지와 어긋나는 Oprimed, CodeCrayon 문서를 함께 정리한다.

## Content Rules

- 제목과 소개는 기술 스택 반복보다 서비스 개발, 운영 도구, AI 워크플로우 세팅 경험을 드러낸다.
- Oprimed는 의료·임상 분석 제품 화면과 분석 데이터, 개발 환경과 검증 시스템 두 축으로 나눈다.
- Code Crayon은 커머스·백오피스, 자막 번역 관리 도구, 모바일 웹뷰 Playground, 무단 도용 콘텐츠 검색 도구를 유지한다.
- All of Them은 보험 가입 웹 성능 개선과 가입·결제/관리자 화면 개발만 노출한다.
- Datalogics는 운영·유지보수, API 개발, 장애 대응과 데이터 마이그레이션을 노출한다.
- Datalogics 인프라 경력은 Wanted에 남아 있는 항목과 동일하게 유지하되, 문구는 과하게 확장하지 않는다.

## Verification

- 메시지 JSON이 Wanted 기준 핵심 문구를 포함하는지 테스트로 확인한다.
- `pnpm type:check:web`로 타입 오류가 없는지 확인한다.
- `pnpm lint:web`로 JSON/TS/MDX 관련 정적 검사를 확인한다.
