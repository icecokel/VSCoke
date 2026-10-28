# 이력서 DB 조회 전환

이 문서는 PR50의 최초 파일 → DB 조회 전환 설계를 보존한 기록이다.
현재 구현 기준은 [resume · VSCoke 공통 경력 DB 계약](./shared-career-data-design.md)이며,
공개 이력서는 문서 key와 현재 불변 버전으로 조회한다. 아래 locale별 본문·초기 seed 구조는
새 공통 이력서의 저장 원본이나 fallback으로 사용하지 않는다.

## 범위와 데이터 소유권

웹 이력서(`/readme`), PDF 미리보기(`/resume/preview`), 경력기술서 상세(`/resume/:slug`),
이력서 검색 항목과 사이트맵을 PostgreSQL → Nest API → Web 조회로 전환한다.
화면과 기존 URL, 회사·프로젝트 순서, 한국어·영어·일본어 문구를 유지한다.
버튼·섹션 이름 등 UI 번역은 next-intl에 남기고 이력서 내용은 API 응답으로 렌더링한다.
파일이나 번역에 남은 옛 본문으로 런타임 fallback하지 않는다.

관리자 편집 화면과 공개 쓰기 API는 만들지 않는다. 기존 RAG 자료/인덱스는 별도 데이터이며
이번 조회 전환에서 자동 동기화하지 않는다. 기존 JSON·MDX 원본은 초기 이관 근거와 기존
RAG import 용도로 보존하지만 웹의 본문 조회 원본으로 사용하지 않는다.

## 저장 구조

- `resume_documents`: `locale` 기본키와 구조화된 `content` JSONB. 언어는 `ko-KR`,
  `en-US`, `ja-JP` 세 가지다. 단일 공개 이력서의 중첩 문서이므로 별도 회사·문장 테이블은
  만들지 않는다.
- `resume_details`: `slug` 기본키, `title`, 선택적 `start_date`, `end_date`, `content` text.
  현재 상세 문서는 언어 공통이므로 기존 동작을 유지한다.
- TypeORM migration에서 현재 공개 파일의 고정 스냅샷을 초기 적재한다. 스냅샷은 API 빌드
  산출물에 포함하고 migration 실행 시 웹 소스 경로에 의존하지 않는다. 기존 행을 덮어쓰지
  않는다. 런타임에서 seed나 파일 읽기를 수행하지 않는다.
- DB 상세 본문은 현재와 같은 신뢰된 운영자 관리 MDX다. 공개 조회만 제공하며 임의 사용자가
  MDX를 업로드하거나 실행하는 경로는 추가하지 않는다.

## API 계약

기존 성공 응답 wrapper `{ success: true, data: ... }`를 유지한다.

- `GET /resume?locale=ko-KR`: `ResumeDocumentDto`. locale 생략 시 `ko-KR`, 허용하지 않는
  locale은 400, 문서가 없으면 404.
- `GET /resume/details`: `ResumeDetailSummaryDto[]`. slug 오름차순. 본문 없이
  `{ slug, title, startDate?, endDate? }`를 반환한다.
- `GET /resume/details/:slug`: `ResumeDetailDto`로 위 요약 필드와 `content`를 반환한다.
  없는 slug는 404. slug 길이·형식을 검증하고 파라미터 바인딩으로 조회한다.

`ResumeDocumentDto`는 다음 필드를 명시적으로 정의한다. JSONB 저장 여부와 무관하게
OpenAPI와 생성 웹 타입은 중첩 DTO로 구체적인 계약을 제공한다.

```ts
interface ResumeDocumentDto {
  locale: "ko-KR" | "en-US" | "ja-JP";
  name: string;
  title: string;
  contact: { email: string; phone: string };
  introduction: string[];
  totalExperience: string;
  lastUpdated: string;
  careers: {
    id: string;
    company: string;
    period: string;
    employmentType: string;
    role: string;
    achievement?: string;
    projects: {
      id: string;
      title: string;
      period?: string;
      fileRef?: string;
      descriptions: {
        subtitle: string;
        detail?: string;
        skills?: string;
        tasks?: string[];
        achievement?: string;
      }[];
    }[];
  }[];
  education: { school: string; period: string; status: string; major: string }[];
  skills: string[];
  certifications: { name: string; date: string; type: string; details: string[] }[];
  links: string[];
  personalProjects: { id: string; title: string; description: string; fileRef: string }[];
}
```

회사·프로젝트는 기존 `resume-data.json`의 공개 목록과 순서대로 각 언어 본문을 합친다.
교육 과정은 `certifications`로 전달하되 첫 항목은 실제 화면에 표시되던
`profile.hybridCourse/hybridDesc`와 날짜를 적재한다. 번역 파일의 기존
`resume.certifications`는 영어·일본어에서 표시 내용과 다르므로 그대로 대체하지 않는다.
미리보기의 최종 갱신일은 `lastUpdated`에 기존 `2026.09`를 적재하고 UI 번역에 보간한다.
개인 프로젝트는 `worxphere`와 `worxphere-recruitment-board` 연결을 보존한다.

## 웹 연결과 오류

생성된 API 타입과 기존 `apiClient`를 사용한다. 서버 페이지에서 데이터를 받아 컴포넌트에
전달한다. 별도의 전역 DB 요청이나 모든 페이지에 대한 필수 이력서 의존성은 만들지 않는다.
본문 조회는 `cache: "no-store"`로 재배포 없이 DB 변경을 반영한다. API 장애는 오류 UI와
재시도 경로로 드러내며 빈 이력서나 파일 내용으로 성공 처리하지 않는다. 상세 404만
Next `notFound()`로 연결한다. API를 사용해 metadata와 sitemap도 생성한다.
빌드 시 API를 강제 조회하지 않도록 상세 경로의 정적 파일 열거를 제거한다.
검색은 DB 이력서로 색인하고 실패 시 다른 검색 영역은 계속 사용할 수 있게 한다.

## 검증과 반영

Sol 6.1 high 두 작업자가 FE/BE를 병렬 구현하고 Terra 6.1 xhigh가 로컬 검증한다.

- 초기 적재: 세 locale의 공개 본문과 모든 상세의 내용·순서·slug를 보존한다.
- API: 정상 조회, 잘못된 locale/slug, 없는 문서, DB 오류, 응답 wrapper와 생성 계약.
- 실제 테스트 PostgreSQL: migration up과 재실행, DB 내용 변경 후 GET 응답 변경.
- 웹: 세 locale 본문, 상세와 404, PDF 미리보기/상세, 검색, 사이트맵, 장애·재시도.
- 실제 DB 내용을 바꾼 뒤 재빌드 없이 웹에 반영되는 것을 확인하고 테스트 데이터를 복원한다.
- lint, 웹 typecheck, 관련 단위/API 테스트, API 계약, 통합 build와 관련 Playwright.

운영 적용은 API migration·배포 후 웹 배포 순서다. 이 작업에서는 운영 배포나 운영 DB
변경을 수행하지 않는다. 최초 migration 이후의 DB 수정은 별도 운영 절차이며 RAG 갱신도
별도 수행해야 한다.
