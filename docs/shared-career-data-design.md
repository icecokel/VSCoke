# resume · VSCoke 공통 경력 DB 구현 계약

## 책임과 범위

DB 스키마, 마이그레이션, 공통 저장 API와 웹·PDF·검색·RAG 소비는 VSCoke가 구현한다.
실제 경력과 이력서 정제·문서 매핑·데이터 등록은 resume 프로젝트가 맡는다.
마이그레이션은 업무 데이터를 seed하지 않으며 실제 데이터 적재는 resume 프로젝트가 맡는다.
검증은 격리된 테스트 DB와 합성 fixture로 수행한다. resume 저장소는 수정하지 않는다.

운영 사전 조회에서 migration ledger가 #1795000000002까지이고 #1795000000003은 미적용이며
resume_documents/resume_details/공통 경력 테이블이 없음을 확인했다. 이에 미적용 #3은 기존
legacy 테이블 DDL만 유지하고 과거 업무 스냅샷 import/INSERT를 제거한다. 스냅샷 artifact와
이미 존재하는 DB 데이터는 삭제하지 않는다. #3과 #4 모두 구조만 만들고 legacy
resume_documents를 자동으로 PE로 오인해 이관하지 않는다.
기존 locale별 본문 테이블은 신규 공개 조회의 원본이나 fallback으로 사용하지 않는다.
실제 공통 데이터 등록 전 미등록 이력서가 404인 것은 의도한 동작이다.

## 사용자 요구

- 기본 문서 key는 pe. /readme?resume=fe|worxphere|nexon 등으로 문서를 선택한다.
- 각 문서는 자기 현재 버전과 과거 버전을 갖는다. PE 갱신이 다른 문서를 덮어쓰지 않는다.
- 새 완성 버전 저장과 current pointer 갱신이 성공하면 다음 웹/PDF/검색 조회에 반영한다.
- 기존 resume 버전 작성·검증 완료 흐름이 공통 API를 호출한다. 별도 웹 발행 승인, 파일
  watcher, 자동 번역, 문서별 물리 테이블을 추가하지 않는다.
- 원본 후보를 편집해도 이미 저장한 완성 문구는 재작성하지 않는다. private/retracted/retired
  등 명시적인 공개 철회는 의존성으로 연결된 공개 조회와 불렛 기준 RAG를 즉시 차단한다.
  초기에는 문서 전체 단위다.

## 테이블

원본은 resume의 docs/career-data-schema/schema.sql에 있는 6개 테이블이다.
career_experiences, career_facts, career_bullets, career_bullet_facts,
career_keywords, career_bullet_keywords를 유지한다. 기존 UUIDv5를 그대로 수용한다.
experience/fact/bullet/keyword에 revision과 created_at/updated_at을 둔다.
bullet의 source_refs JSONB와 review_note TEXT를 보존한다. 사실 근거 evidence와 metric의
내부 필드·기준일·미확인 null을 검증하며 내부 경로/메모를 공개 응답으로 내보내지 않는다.
bullet-fact는 같은 experience를 강제하는 복합 FK와 검토 당시 fact_revision을 유지한다.
현재 fact revision으로 FK를 걸거나 과거 참조를 자동 갱신하지 않는다.

### resumes

id UUID PK, key TEXT, kind(base/targeted), track(front-end/product-engineer), locale,
target_key nullable, visibility(private/public), current_version_id nullable,
revision, current_version_changed_at, created_at, updated_at.
UNIQUE(key, locale). 기본 공개 범위는 private. key는 소문자·숫자·단일 하이픈 조합이며
최대 80자다. kind=base이면 target_key는 null, targeted이면 비어 있지 않은 값이다.

### resume_versions

id UUID PK, resume_id FK, version_name, parent_version_id nullable FK,
content JSONB, content_hash, source_ref JSONB nullable, created_at.
UNIQUE(resume_id, version_name), UNIQUE(id, resume_id).
resumes의 (current_version_id,id)는 versions의 (id,resume_id)를 참조한다.
버전 본문과 의존성은 생성 후 불변이다. 이전 v29/v62 등의 버전명도 보존한다.
신규 내용 변경은 신규 version_name으로 등록한다. content에는 기존 ResumeDocumentDto의
공개 본문 구조만 들어가며 내부 source_ref/검토 요약은 분리한다.

### resume_content_dependencies

id UUID PK. 대상은 resume_version_id / detail_slug / source_item_id 중 정확히 하나,
원본은 experience_id / fact_id / bullet_id / keyword_id 중 정확히 하나를 FK로 참조한다.
source_revision > 0과 당시 원본의 source_snapshot JSONB를 보존한다.
detail 대상에만 detail_revision > 0을 둔다. 문서 버전과 RAG 행은 자체 ID가 버전을 식별한다.
동일 대상 버전 + 동일 원본 중복은 금지한다(NULLS NOT DISTINCT 또는 동등한 제약).
source_revision은 유일성 키에서 제외한다. 원본별 역조회 인덱스를 둔다.
일반 원본 수정은 저장된 version을 바꾸지 않는다. 공개 철회에만 공개 소비를 즉시 막는다.

기존 resume_details는 slug별 MDX를 유지하고 revision/visibility/updated_at을 추가한다.
경력 외 개인 과제까지 원본 경험에 강제로 연결하지 않는다. legacy 상세의 자동 이관·공개
재승인은 하지 않는다. 관련 데이터 등록은 관리 API로 resume가 수행한다.

## 관리 API

Bearer CAREER_DATA_WRITE_KEY(32자 이상, 서버 전용)로 아래 조회·쓰기 전체를 보호한다.
미설정은 503, 잘못된 인증은 401. 일반 Google 로그인만으로 쓰기를 허용하지 않는다.
기존 timingSafeEqual 기반 guard 패턴을 재사용한다. 응답은 no-store이고 비밀키를 로그에 남기지 않는다.

- GET /career-data: 내부용 원본 6개 테이블과 현재 revision 조회.
- PUT /career-data: experiences/facts/bullets/keywords 배열을 한 트랜잭션에서 upsert.
  각 원본은 id와 expectedRevision(생성=0)을 받는다. 저장한 revision은 서버가 증가시킨다.
  bullet은 facts[{factId,factRevision}], keywordIds의 전체 연결을 함께 받아 원자적으로 교체한다.
  관계 변경도 bullet revision을 올린다. 배열에서 누락했다고 기존 원본을 삭제하지 않는다.
  concrete DTO를 정의하고 정확한 필드/예제는 구현 OpenAPI와 이 문서의 후속 예제로 인계한다.
- POST /resume-management/versions: resume 메타정보(key/kind/track/locale/targetKey/visibility),
  expectedRevision, expectedCurrentVersionId(null 허용), versionName, parentVersionId?,
  content(기존 공개 Resume content), dependencies[{kind,id,revision}], sourceRef?를 받는다.
  기존 문서는 key/locale로 찾고 새 문서 id는 생성한다. 현재 원본의 참조·버전·공개 조건을
  검증한 뒤 version·dependency·current pointer·RAG 원문 갱신을 한 트랜잭션에 저장한다.
- GET /resume-management/resumes: 내부용 문서 목록·현재 revision/version 조회.
- PATCH /resume-management/resumes/:id: expectedRevision과 visibility로 공개 철회를 처리한다.
- PUT /resume-management/details/:slug: expectedRevision(생성=0), 상세 본문/날짜/visibility,
  dependencies를 받고 상세·의존성·검색 갱신을 처리한다.
- POST /career-data/facts/:id/publish: expectedRevision을 받아 confirmed/public 사실을
  독립 RAG 보강 자료로 명시 등록한다. 현재 사실 원문의 locale은 ko-KR이며 자동 번역하지 않는다.
  공개 본문·측정 조건·표현 한계를 합친 결과가 기존 컨텍스트 예산 4000자를 넘으면 400으로
  거부한다. 저장 원본은 더 길 수 있지만 검색 시 한계를 조용히 자르지 않는다.

관리 쓰기는 동일 transaction advisory lock 또는 동등한 잠금으로 직렬화한다. expected
revision/current version 불일치는 409. 권한 있는 내부 저장도 공개 시에는 공개·확인된 사실,
ready/public 불렛, public_title과 참조 버전의 일치를 검사한다. 불렛을 지정하면 연결된 사실과
경험 등 실제 의존성도 빠짐없이 저장한다. private 문서의 검토용 저장은 공개 판정과 구별한다.

같은 문서/versionName/의미 있는 payload hash의 재시도는 기존 결과를 반환한다. 같은 이름에
다른 내용이면 409. V1의 재시도가 이미 V2인 current pointer를 V1으로 되돌리지 않는다.
hash에는 본문·메타정보·명시한 출처/의존성의 의미 있는 값이 들어가며 요청 시각은 제외한다.
DB 실패는 전부 rollback하고 동기화 완료라고 반환하지 않는다. 요청·배열·본문 크기를 제한하고
엄격한 nested DTO 검증을 사용한다. 큰 관리 payload가 필요하면 관리 경로에만 bounded parser를 적용한다.

## 공개 API와 웹 계약

GET /resume?locale=ko-KR&resume=pe: 생략한 resume만 pe. 명시 key의 미등록/비공개/현재 버전
없음/공개 철회는 404이고 다른 문서나 파일로 fallback하지 않는다. 기존 본문을 최상위에
유지하면서 documentId, key, versionId, versionName, contentHash를 추가한 ResumeDocumentDto를 반환한다.
sourceRef/source_snapshot/evidence 내부 위치 등은 공개 응답에서 제외한다.
GET /resume/details 및 /resume/details/:slug는 공개 가능 상세만 반환한다.
GET /resume/preview?locale=ko-KR&resume=pe는 ResumePreviewDto { document: ResumeDocumentDto,
details: ResumeDetailDto[] }를 반환한다. 한 REPEATABLE READ 트랜잭션에서 문서와 연결된
fileRef 상세를 읽어, PDF 생성 도중 current pointer가 바뀌어도 본문·상세 구성이 섞이지 않게
한다. 순서·누락 상세 오류 처리를 유지한다. 상세 자체의 전체 과거 버전 저장은 추가하지 않는다.

웹 /readme, /resume/preview, 이력서 검색 인덱스, 상세 복귀 링크, 공유 URL, PDF 파일명/요청에
선택 key와 locale을 유지한다. metadata도 선택 문서 기준. no-store/force-dynamic으로 다음
조회에 DB 변경을 반영하며 개별 레코드별로 fallback하지 않는다. 기존 번역 UI 문구는 유지한다.
본문이 없는 locale을 한국어/다른 문서로 가장하지 않는다.

## RAG 소비 계약 (BE/FE 담당 간 고정 접점)

이력서 채팅은 이력서 문서 본문이 아니라 경험 단위인 공개 불렛을 근거로 답한다. 문서 버전은
웹·PDF 표시용 동결 본문이며 RAG 원문으로 발행하지 않는다. 기존 resume_version 원문 행은
삭제하지 않지만 검색 대상에서 제외하고 다음 관리 쓰기에서 inactive로 정리한다.

resume_source_items에 resumeId/resumeVersionId(nullable UUID FK), isCurrent(boolean)를 추가한다.
career_data에 한해 (sourceType,sourceKey) WHERE isCurrent=true unique를 강제한다.
불렛 sourceKey=career-bullet/<bullet UUID>/ko-KR, itemType=career_bullet, metadata.bulletId.
독립 사실 sourceKey=career-fact/<fact UUID>/ko-KR, itemType=career_fact.
DB 상세의 sourceKey=resume-detail/<slug>, itemType=project_detail, metadata.slug로 연결한다.
세 종류 모두 resumeId/resumeVersionId는 null이다. 상세 MDX는 언어 공통 자료라 locale이 null이며
불렛·독립 사실 원문은 ko-KR이고 자동 번역하지 않는다.

불렛 원문은 관리 저장 서비스가 PUT /career-data와 DELETE /career-data/:kind/:id 트랜잭션 안에서
자동으로 맞춘다. 대상은 현재 ready/public이고 경험 publicTitle이 있으며, 연결 사실이 하나 이상이고
모두 미삭제·confirmed·public·검토 당시 fact_revision과 같은 불렛이다. 원문은 회사·publicTitle,
불렛 문구, 연결 키워드 label, 연결 사실의 내용·측정 조건·표현 한계로 만든다.
sourceRefs/reviewNote/evidence locator는 넣지 않는다. 공개 여부는 동결 snapshot이 아니라 현재
불렛·경험·사실 상태로 판단하므로, 불렛 private/retired/삭제나 연결 사실의 철회·수정은 다음
검색부터 즉시 제외된다. 원문 hash는 내용만으로 계산한다. 같은 원문으로 돌아오면(공개→비공개→공개,
문구 되돌림) 기존 행과 임베딩을 재활성화하고, 내용이 바뀌면 새 행을 만들고 이전 행은 current에서 내린다.
삭제 tombstone 행은 되살리지 않는다. 운영 사전 적재처럼 원문이 아직 없는 불렛은 네 배열이 모두
빈 PUT /career-data 한 번으로 생성한 뒤 resume:index로 임베딩한다.

contentHash는 공개 본문/공개 메타정보를 포함하고 내부 메모는 노출하지 않는다.
관리 저장 서비스가 발행 원문을 생성·원자 교체하며 importer가 이를 임의로 덮어쓰지 않는다.
철회 시 current 행은 비활성 tombstone으로 남겨 과거 active 행이 다시 선택되지 않게 한다.

새 원문은 저장 즉시 키워드 검색할 수 있으며 이전 투영은 제외한다. 임베딩은 기존 resume:index가
DB active 원문을 durable 작업 대상으로 삼아 생성한다. 새 큐 서비스는 추가하지 않는다. 늦게
완료한 인덱싱은 isCurrent와 공개 조건을 재확인한 뒤에만 활성화한다. 원문은 즉시, 벡터는
인덱싱 뒤에 반영된다. 긴 원문의 키워드 조회는 질문에 맞는 제한 길이 청크를 선정한다. hybrid 병합은
같은 청크를 합치되 한 원문에서 최대 3개 청크까지 함께 전달해 긴 상세의 여러 근거를 잃지 않는다.
독립 사실의 조건·한계는 컨텍스트에서 보존한다.

career_bullet/career_fact는 resume 채널에만 허용한다. resume 채널은 career_bullet,
career_fact, project_detail을 검색한다. main은 프로젝트 상세와 사이트 안내의 기존 범위를
유지하되 DB 상세인 career_data/project_detail을 추가한다. main에 career_bullet/career_fact가
들어가지 않는 것을 검증한다. 상세 upsert는 legacy app_resume 원문과 벡터의 상태를 수정하지 않는다.
새 reader가 대응하는 exact sourceKey와 #section family를 현재 career_data 상세(tombstone 포함)로
대체해 오래된 파일 본문으로 우회하지 않게 한다. 관리 저장의 벡터 철회도 parent 원문이
career_data인 행에만 적용한다.

공개 이력서 채팅은 선택한 resume key를 대화 생성·복원·질문 요청에 계속 묶는다. 미등록·비공개
문서의 채팅은 404이며 legacy RAG로 우회하지 않는다. 검색 범위는 문서별로 나누지 않고 같은
공개 경험 불렛·사실·상세를 사용한다. 브라우저 저장키는 문서별로 구분한다(기본 PE와 main은 기존
대화 저장 호환성 유지). 기존 턴은 근거를 대체하지 않으며 답변은 현재 검색 근거를 따른다.
legacy 파일 근거를 섞으면 원본 철회가 옛 파일 사본으로 우회되므로 조회 fallback으로 쓰지 않는다.
구 원문을 물리 삭제하지 않으며 필요한 근거는 resume가 원본으로 매핑·등록한다. main의 사이트
안내와 미전환 프로젝트 자료는 유지하되 현재 project_detail 행(tombstone 포함)이 있는 상세의 옛
파일 source family는 제외해 재import로 철회 자료가 되살아나지 않게 한다.

### 웹·PDF 본문과 원본 철회

웹 /readme와 PDF는 승인된 동결 버전 본문을 그대로 보여 준다. dependencies에 기록한 원본이
철회·삭제되면 해당 버전을 차단하지만, dependencies 등록은 선택 사항이며 본문 문구와 불렛 사이에
구조적 연결은 없다. 의존성이 없는 버전(예: 초기 등록한 pe/fe)은 원본 철회로 자동 차단되지 않는다.
이런 문서의 문구를 철회하려면 새 버전을 저장하거나 PATCH로 문서를 private 전환한다.

## 검증과 완료

구현은 Sol 6.1 high 두 작업자가 API/저장과 웹/RAG 소비를 나눠 진행한다.
구현 후 Terra 6.1 xhigh 두 작업자가 별도의 테스트 DB로 API·DB와 웹·RAG를 병렬 검증한다.
Node24 런타임과 모든 임시 산출물은 원래 workspace의 output 아래만 사용한다.

필수 확인: SQL 제약, UUID 보존, 인증/입력 검증, 생성·수정 CAS, 관계 원자성, current 버전
소속, 버전 불변·부모 연결, 같은 요청 재시도/과거 재시도, private/철회 차단, metadata 비노출,
PE 기본값·명시 key·locale·404, 문서별 독립 갱신, 링크/PDF 선택 보존, 새 현재 버전의 재빌드
없는 표시, RAG 채널 격리·불렛 live 공개 조건·키워드 즉시 갱신·오래된 벡터 작업 차단·실패 재시도.
검증용 임베딩 공급자는 결정론적으로 대체하고 실제 LLM 품질은 별도 범위로 보고한다.
lint/typecheck/API contract/관련 단위와 PostgreSQL 통합/웹 E2E/build를 실행하고 알려진 기존
범위 밖 실패는 분리한다.

## 앱 배포 전 운영 사전 적재

사용자는 앱 배포 전 운영 데이터 사전 적재를 별도로 승인했다. root가 운영 백업 후 schema-only
migration을 적용하고 CareerDataModule/ResumeModule만 포함한 임시 관리 API를 loopback에
실행한다. 실제 데이터 등록은 resume 프로젝트가 인증된 관리 API로 수행한다. 이 절차는
현재 운영 앱의 배포·재시작을 포함하지 않는다.

현재 운영 앱은 app_resume/resume_workspace를 소비하며 career_data를 소비하지 않는다.
사전 적재 시 기존 source/vector 행·상태와 운영 앱의 source 허용 목록을 유지한다. 새 원문과
철회 tombstone은 career_data에만 저장하며 새 reader의 family 제외 조건은 이후 앱 전환부터
적용된다. 운영 사전 적재만으로 기존 앱의 철회 동작이 바뀌었다고 보장하지 않는다.

## 관리 payload 인계 예제

아래 값은 API 계약 설명용 합성 데이터이며 migration/seed로 적재하지 않는다. 모든 요청은
`Authorization: Bearer <CAREER_DATA_WRITE_KEY>`와 `Content-Type: application/json`을 사용한다.
관리 경로 본문 상한은 2 MiB다. 배열·문자열·JSON 깊이에도 DTO 상한이 있으며 unknown DTO
필드는 400이다. evidence/sourceRefs/sourceRef의 추가 원본 JSON 필드는 크기·깊이·JSON 타입을
검사한 뒤 보존한다. evidence는 kind/locator/as_of(실제 YYYY-MM-DD 날짜), metric은 value/unit과
measured_by/environment/period/conditions가 필요하다. 미확인 측정 조건은 필드 누락 대신 null이다.

`PUT /career-data`는 4개 배열을 모두 받는다. 누락하지 말고 변경 없는 배열은 `[]`로 보낸다.
UUIDv5를 포함한 기존 UUID를 변환하지 않는다. 각 원본의 생성은 expectedRevision=0,
수정은 마지막 응답 revision이다. 기본 visibility는 private, fact 기본 상태는
needs_confirmation, bullet 기본 상태는 draft이다. ready/private 검토 후보도 저장할 수 있다.
ready는 같은 experience의 확인된 현재 fact 연결이 필요하며, ready/public에는 공개 fact와
경험 publicTitle까지 필요하다.

```json
{
  "experiences": [
    {
      "id": "5bb2635b-3510-51a8-8ded-0b9d3bbb3c76",
      "expectedRevision": 0,
      "company": "Synthetic Company",
      "project": null,
      "title": "Internal title",
      "publicTitle": "Public project",
      "periodStart": "2026-01",
      "periodEnd": null
    }
  ],
  "facts": [
    {
      "id": "143812d0-f7ea-4e51-bba6-cfe4a1615101",
      "expectedRevision": 0,
      "experienceId": "5bb2635b-3510-51a8-8ded-0b9d3bbb3c76",
      "kind": "validation",
      "content": "Synthetic verified behavior",
      "verificationStatus": "confirmed",
      "evidence": [
        { "kind": "document", "locator": "internal/example.md", "as_of": "2026-10-01", "line": 12 }
      ],
      "metric": {
        "value": 5,
        "unit": "ms",
        "measured_by": null,
        "environment": null,
        "period": null,
        "conditions": null
      },
      "claimBoundary": "Synthetic measurement only",
      "visibility": "public"
    }
  ],
  "keywords": [
    {
      "id": "143812d0-f7ea-4e51-bba6-cfe4a1615102",
      "expectedRevision": 0,
      "key": "synthetic-test",
      "label": "Synthetic test",
      "kind": "task",
      "aliases": []
    }
  ],
  "bullets": [
    {
      "id": "143812d0-f7ea-4e51-bba6-cfe4a1615103",
      "expectedRevision": 0,
      "experienceId": "5bb2635b-3510-51a8-8ded-0b9d3bbb3c76",
      "text": "Synthetic approved wording",
      "focus": null,
      "status": "ready",
      "visibility": "public",
      "sourceRefs": [{ "path": "internal/example.md", "line": 12, "hash": "original-source-hash" }],
      "reviewNote": "Internal review note",
      "facts": [{ "factId": "143812d0-f7ea-4e51-bba6-cfe4a1615101", "factRevision": 1 }],
      "keywordIds": ["143812d0-f7ea-4e51-bba6-cfe4a1615102"]
    }
  ]
}
```

응답과 `GET /career-data`는 experiences/facts/bullets/bulletFacts/keywords/bulletKeywords
6개 배열을 반환하며 내부 행의 필드명은 원본 SQL과 같은 snake_case다. revision과 내부
source_refs/review_note/evidence를 포함하므로 공개 API에 그대로 사용하지 않는다.
관계 배열은 bullet 단위 전체 교체다. fact가 수정되면 기존 ready 후보는 needs_review로
바뀌며 bullet revision도 증가한다. 동결 문서와 snapshot은 바뀌지 않는다.

`POST /resume-management/versions`의 content에는 공개 본문만 넣는다. locale과 관리
metadata는 content 밖이다. base는 targetKey=null, targeted는 비어 있지 않은 targetKey가
필요하다. parentVersionId는 다른 base 문서의 버전도 참조할 수 있다. dependencies의 bullet을
지정하면 연결된 experience/fact/keyword와 검토 당시 revision을 서버가 검증·확장해 저장한다.

```json
{
  "key": "pe",
  "kind": "base",
  "track": "product-engineer",
  "locale": "ko-KR",
  "targetKey": null,
  "visibility": "public",
  "expectedRevision": 0,
  "expectedCurrentVersionId": null,
  "versionName": "v29",
  "parentVersionId": null,
  "content": {
    "name": "Synthetic Person",
    "title": "Synthetic Resume",
    "contact": { "email": "test@example.test", "phone": "" },
    "introduction": ["Synthetic introduction"],
    "totalExperience": "1 year",
    "lastUpdated": "2026.10",
    "careers": [],
    "education": [],
    "skills": [],
    "certifications": [],
    "links": [],
    "personalProjects": []
  },
  "dependencies": [
    { "kind": "bullet", "id": "143812d0-f7ea-4e51-bba6-cfe4a1615103", "revision": 1 }
  ],
  "sourceRef": { "path": "internal/completed-version.md", "review": "internal review" }
}
```

성공 응답 data는 documentId/key/locale/revision/versionId/versionName/currentVersionId/
contentHash이다. 다음 버전은 반환 revision과 currentVersionId를 expected 값으로 보내고
새 versionName을 사용한다. 같은 요청 재시도 시 expected 값은 원래 값을 유지할 수 있다.
본문·문서 metadata·명시 dependencies·sourceRef·parent가 다르면 같은 versionName을 재사용할
수 없다. 과거 버전 재시도 결과의 versionId와 currentVersionId가 서로 다를 수 있으며
과거 versionId를 current로 다시 쓰지 않는다. `GET /resume-management/resumes`는 모든
문서의 id/key/locale/kind/track/targetKey/visibility/revision/currentVersionId를 반환한다.

`PATCH /resume-management/resumes/<documentId>` 본문은
`{"expectedRevision":1,"visibility":"private"}`다. public 재설정은 동결 snapshot 자체의
공개·확인·ready 조건과 현재 철회 조건을 모두 통과해야 한다. 비공개 검토 snapshot을 공개
상태로 바꾸려면 새 공개 버전으로 저장한다. 예전에 공개 승인된 현재 원문은 재공개할 수 있다.

`PUT /resume-management/details/synthetic-project` 예제는 다음과 같다. 신규 slug는
expectedRevision=0이며 역사적 상세 행은 revision=1/private으로 남아 있다. 성공 data는
slug/revision이다. 상세의 public/private와 현재 의존성으로 조회·검색이 결정된다.

```json
{
  "expectedRevision": 0,
  "title": "Synthetic detail",
  "content": "# Synthetic MDX",
  "startDate": "2026.01",
  "endDate": null,
  "visibility": "public",
  "dependencies": [{ "kind": "fact", "id": "143812d0-f7ea-4e51-bba6-cfe4a1615101", "revision": 1 }]
}
```

`POST /career-data/facts/143812d0-f7ea-4e51-bba6-cfe4a1615101/publish` 본문은
`{"expectedRevision":1}`이며 성공 data는 sourceItemId다. 독립 발행은 현재 confirmed/public
fact와 경험 publicTitle을 요구한다. 공개 원문은 회사/publicTitle·fact content·근거 kind와
as_of·metric 전체 측정 조건·claimBoundary를 포함한다. locator/sourceRefs/reviewNote는
제외한다. 검색 컨텍스트 예산에 맞춰 합성 공개 원문이 4000자를 넘으면 400으로 거부하며
원본 저장 상한과 별개다. 뒤를 자르거나 표현 한계를 누락해 발행하지 않는다.

Preview는 한 REPEATABLE READ snapshot에서 문서와 career.projects.fileRef 상세를 읽는다.
프로젝트 등장 순서대로 중복 slug를 제거하며 필요한 상세가 없거나 철회됐으면 503이다.
선택 문서 자체가 없거나 비공개인 경우의 404와 구분하고 웹의 재시도 오류 처리를 유지한다.
개인 과제 PDF 부록을 새로 추가하지 않으며 상세의 전체 과거 본문 버전 저장도 하지 않는다.
