# 이력서 관련 논리삭제 계약

## 범위

대상 19개 테이블에 nullable timestamptz `deleted_at`을 추가한다. 기존 행은 NULL을 유지한다.

- career_experiences, career_facts, career_bullets, career_keywords
- career_bullet_facts, career_bullet_keywords
- resumes, resume_versions, resume_content_dependencies, resume_details, resume_documents(legacy)
- resume_source_items, resume_vector_chunks, resume_import_batches
- resume_rag_keyword_groups, resume_rag_keyword_terms, resume_rag_chat_logs
- resume_chat_conversations, resume_chat_turns

원본·본문·근거는 삭제 표시 후에도 보존한다. 새 migration만 추가하고 운영에 이미 적용한
#3/#4는 수정하지 않는다. 이번 작업에서 실제 사용자 레코드를 삭제 표시하지 않는다.
스키마 적용은 백업·기존 행 보존 검증 후 할 수 있으나 운영 앱은 별도 배포다.

## 기준 동작

일반 관리·공개 조회는 deleted_at IS NULL만 대상으로 한다. 관리 GET에는 인증된
includeDeleted=true 옵션을 제공해 원본/문서 삭제 표시를 확인한다. 기본값은 false다.
관리 응답에는 deletedAt/deleted_at을 명시하고 공개 DTO에는 내부 삭제 이력을 노출하지 않는다.
삭제된 ID/key/버전명은 예약된 상태로 유지한다. 일반 upsert/재시도/공개 전환은 삭제된 항목을
자동 복구하지 않고 409 또는 404를 반환한다. 복구 UI와 자동 cascade 복구는 추가하지 않는다.

삭제는 기존 관리 인증·transaction advisory lock·expectedRevision을 사용한다. 삭제 시 최초
deleted_at을 보존하고 revision/updated_at을 갱신한다. 반복 삭제는 올바른 인증과 대상 식별
범위에서 이미 삭제된 결과를 반환하거나 명시적으로 404 처리하되 타 레코드는 건드리지 않는다.
DELETE body가 필요한 관리 요청은 JSON DTO로 expectedRevision을 받는다.

## 관리 삭제 API

- DELETE /career-data/:kind/:id (kind=experience/fact/bullet/keyword)
- DELETE /resume-management/resumes/:id
- DELETE /resume-management/versions/:id (expectedRevision은 소유 resumes의 revision)
- DELETE /resume-management/details/:slug

원본 삭제 시 관련 후보 관계는 논리삭제한다. experience는 소속 facts/bullets와 그 관계까지,
fact는 연결된 bullet-fact 관계와 해당 불렛의 재검토 상태까지, bullet은 그 관계까지,
keyword는 해당 bullet-keyword 관계까지 처리한다. 공유 keyword나 다른 경험의 사실은 삭제하지 않는다.
삭제된 부모를 참조한 신규/수정 연결은 거부한다. 불렛 관계 전체 교체는 물리 DELETE 대신
제외 관계의 deleted_at을 설정하고, 요청에 명시된 관계만 upsert로 활성화한다. 이때 부모·대상은
모두 미삭제 상태여야 한다. 관계 재선택은 명시적인 연결 복구이며 원본 자체는 복구하지 않는다.

문서 삭제는 소유 버전과 버전 의존성/파생 검색을 차단한다. 과거 본문은 보존한다.
현재 버전 삭제 시 current_version_id를 NULL로 만들고 소유 문서 revision을 증가시킨다.
다른 문서나 이전 버전으로 fallback하지 않는다. 과거 버전만 삭제하면 현재 선택은 유지한다.
다른 문서가 분기한 parent_version_id는 감사용 참조이며 부모 버전 삭제만으로 자식 이력서를
삭제하지 않는다. 삭제된 부모 버전으로 새 분기를 만들 수는 없다.

resume_versions와 frozen dependencies의 불변 trigger는 본문/출처/관계 수정·물리삭제를 계속
거부하되 deleted_at만 바꾸는 UPDATE를 허용한다. 임의의 대상 교체나 본문 수정은 허용하지 않는다.
dependency 삭제가 차단 조건을 없애는 우회가 되면 안 된다. 대상에 삭제된 dependency가 있으면
그 대상을 공개 소비에서 차단한다. 사실·불렛·경험 삭제도 해당 snapshot을 공개 소비에서 차단한다.
키워드 삭제는 원본 사전/현재 연결에서 제외하며 역사적 문서 문구를 재작성하거나 그 문서 전체를
차단하지 않는다. 새 의존성에는 삭제된 keyword를 연결하지 못한다.

## RAG 및 대화

TypeORM으로 관리하는 10개 이력서/RAG entity에는 DeleteDateColumn(name=deleted_at)을 연결한다.
raw SQL, JOIN, 집계·검색·키워드·인덱서에는 삭제 조건을 명시한다. 삭제된 현재 source/tombstone을
최신 선택 전에 제거해 과거 active source로 돌아가면 안 된다. keyword/vector 양쪽에서 검증한다.
공개 문서·상세의 deleted_at, 현재 version의 deleted_at, source/dependency/원본의 삭제를 함께
검증한다. 늦은 임베딩 저장은 잠금 안에서 삭제 상태를 다시 확인해 재노출을 막는다.

벡터 캐시 교체/고아 정리는 물리 DELETE 대신 논리삭제한다. 활성 벡터 profile 유일성은
deleted_at IS NULL 조건으로 바꿔 새 행으로 재생성할 수 있게 한다. 삭제된 원본에서 벡터를
재생성하지 않는다. source hash/문서 key/불변 버전 유일성은 유지한다.
career_data의 isCurrent 유일성은 삭제 tombstone도 포함해 유지하고, 최신 삭제 source를 건너뛰어
과거 active source가 선택되지 않게 한다. source/벡터 재생성은 미삭제 원본의 명시된 생명주기만
허용하며 삭제된 원본 자체를 자동 복구하지 않는다.
importer는 withDeleted 등으로 삭제된 기존 source를 확인하고 자동 save로 삭제를 취소하거나
삭제된 현재 source가 superseded 처리되어 과거 행이 보이는 우회를 만들지 않는다.
import batch는 작업 이력이며 그 삭제만으로 관련 원문을 임의 삭제하지 않는다.

RAG 키워드 그룹/단어의 삭제·disabled 상태를 코드 기본 키워드 병합이 되살리지 않게 한다.
DB에 명시된 삭제/비활성 항목을 우선하고, 단순 missing-table fallback과 구분한다.

대화의 사용자 삭제는 conversation과 turns를 한 트랜잭션에서 논리삭제한다. 접근키가 있어도
삭제된 대화의 복원·재시도·추가 턴은 실패해야 한다. 생성 중 삭제된 대화에 늦은 응답을 저장하지
않는다. 최근 50개 유지에서 제외한 turns도 논리삭제하며 동일 requestId가 재실행되어 삭제된
턴을 자동 복구하지 않도록 tombstone을 확인한다.

사용자는 일반 삭제의 논리삭제와 보존기간 만료 후 기존 영구정리 유지를 선택했다.
기존 보존기한의 물리 purge는 명시적인 예외이고 일반 사용자 삭제와 분리한다.
새 보존기간/자동 purge 작업은 만들지 않는다. 채팅 UI/문서가 영구 삭제를 약속하거나 50개만
실제 저장한다고 표현한다면 논리삭제·기존 보존기간과 일치하게 좁은 문구를 수정한다.

## 분업과 검증

Sol 6.1 high A: migration/원본·문서·관계 삭제 및 관리 API/공개 dependency predicate/계약.
Sol 6.1 high B: RAG entity/검색·import·index·키워드·대화 논리삭제/관련 웹 문구와 테스트.
Terra 6.1 xhigh A: 격리 PG에서 schema/DDL·삭제·CAS·관계·불변 버전·rollback·인증 검증.
Terra 6.1 xhigh B: 웹/PDF/검색/RAG/대화에서 삭제 후 비노출·늦은 작업·기본 키워드 우회 검증.

새 schema로 운영 데이터를 지우지 않는다. 합성 데이터로 삭제/관계 재선택을 검증하고,
운영 적용 시 19개 테이블의 행 수와 기존 데이터 fingerprint가 유지되며 deleted_at이 모두
NULL인 것을 확인한다. API·웹 lint/type/계약/관련 단위·실 DB 통합·E2E·build를 실행한다.
down은 삭제 표시가 남은 상태에서 컬럼을 제거해 삭제 데이터를 재노출하지 않도록 사전 검사 후
거부한다. 데이터 삭제/복구를 임의로 수행해 rollback을 통과시키지 않는다.
