# Resume Question UX Design

## Goal

이력서 질문 기능을 "이력서를 질문으로 빠르게 확인하는 도구"로 인식되게 만든다. 기능 강화보다 첫 화면, README 진입점, 답변 근거 표시를 통해 사용자가 무엇을 할 수 있는지 바로 이해하게 하는 것이 목표다.

## Product Direction

- 기준 화면은 `/:locale/resume/question`이다.
- README 하단 질문창은 기준 화면으로 이어지는 빠른 입구로 유지한다.
- 주요 사용자는 이력서를 훑는 방문자와 채용 관점에서 경력, 프로젝트, 기술 적합성을 빠르게 확인하려는 사람이다.
- "AI 채팅"보다 "이력서 탐색 도우미 + 채용 담당자용 빠른 Q&A"로 보이게 한다.

## Recommended UX

### First Screen

상단 메시지는 다음 의미를 전달한다.

- 이력서를 질문으로 빠르게 확인할 수 있다.
- 직무 적합성, 핵심 프로젝트, 기술 역량, 일하는 방식을 질문으로 확인할 수 있다.
- 사용자는 질문 주제를 먼저 고르고, 예시 질문을 눌러 입력창에 채운 뒤 직접 전송한다.

질문 주제는 네 가지로 둔다.

- 직무 적합성
- 핵심 프로젝트
- 기술 역량
- 일하는 방식

각 주제는 3개 예시 질문을 제공한다. 질문 예시 클릭은 API를 바로 호출하지 않고 입력창에만 채운다.

### README Entry

README 하단 질문창은 유지한다. 문구는 "README를 읽다가 궁금한 점"과 "이력서 근거를 찾아 답변 준비"를 명확히 말한다.

### Answer Trust

답변 카드 상단에는 작은 "이력서 근거 기반" 배지를 표시한다. 답변 하단 근거 영역은 "참고한 이력서 근거"로 라벨링해, 사용자가 답변 전에 신뢰 구조를 이해하고 답변 후 근거를 확인할 수 있게 한다.

답변 문체는 제품상 "결론 먼저 + 근거 요약"을 지향한다. 이번 UI 작업에서는 답변 생성 prompt/API 계약을 바꾸지 않고, 화면에서 신뢰 구조와 추천 질문만 개선한다.

## Scope

- Modify `apps/web/src/features/resume-rag/components/resume-question-chat.tsx`
- Modify `apps/web/src/features/resume-rag/components/readme-resume-question-composer.tsx`
- Modify locale copy in `apps/web/messages/{ko-KR,en-US,ja-JP}.json`
- Modify `apps/web/tests/e2e/resume-rag-chat-public.spec.ts`

## Non-Goals

- API 계약 변경
- 답변 prompt 변경
- 서버 저장형 대화 기록
- 새 shadcn primitive 추가
- README 진입점을 CTA-only 형태로 축소

## Acceptance Criteria

- 첫 화면에서 `이력서를 질문으로 빠르게 확인하세요`가 보인다.
- 첫 화면에서 네 가지 질문 주제가 보인다.
- 주제를 누르면 예시 질문이 펼쳐진다.
- 예시 질문을 누르면 API 요청 없이 입력창에 질문이 채워진다.
- 답변 카드 상단에 `이력서 근거 기반` 표시가 보인다.
- 답변 하단 근거 영역에 `참고한 이력서 근거` 라벨이 보인다.
- README 질문창은 유지하되 "README를 읽다가 궁금한 점" 맥락이 문구에 반영된다.
