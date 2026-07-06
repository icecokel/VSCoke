# RAG Chat UI Design

확인 기준일: 2026-07-06

## 목표

이력 질문 페이지를 로그인 없이 방문한 사람이 바로 질문할 수 있는 채팅 작업면으로 개선한다. 현재 VSCoke의 VSCode 스타일을 유지하면서 추천 질문, 답변 근거, 실패 상태를 더 빠르게 스캔할 수 있게 만든다.

## 범위

- 대상 페이지: `/:locale/resume/question`
- 대상 컴포넌트: `apps/web/src/features/resume-rag/components/resume-question-chat.tsx`
- 대상 문구: `apps/web/messages/{ko-KR,en-US,ja-JP}.json`의 `resumeRag`
- 대상 테스트: `apps/web/tests/e2e/resume-rag-chat-public.spec.ts`

## 시각 방향

VSCode 편집기 안의 질문 패널처럼 보이게 한다. 큰 랜딩 히어로나 마케팅 카드는 만들지 않는다. 기존 사이트의 어두운 회색 바탕, 얇은 border, `blue-300` 액센트, `yellow-200` 활성 톤을 유지한다.

## UX 요구사항

1. 첫 방문 빈 상태에는 추천 질문 4개를 노출한다.
2. 추천 질문을 누르면 입력창에 질문이 채워지고 바로 전송할 수 있다.
3. 사용자 질문은 우측 compact block, 답변은 좌측 넓은 editor block으로 구분한다.
4. 답변 근거는 본문 아래 citation block으로 분리하고 문서명, 섹션, 유사도를 스캔 가능하게 표시한다.
5. 답변 근거가 부족한 경우 기존 `grounded=false` 안내를 유지하되 답변 block 안에서 눈에 띄게 표시한다.
6. 실패 상태는 기존 분기(origin 차단, service unavailable, rate limit, contract, request)를 유지하고, 재시도 가능 여부를 명확히 보여준다.
7. 로그인 버튼이나 로그인 유도 문구는 공개 질문 흐름에 노출하지 않는다.

## 컴포넌트 기준

- shadcn `Button`, `Textarea`, `Skeleton`을 그대로 재사용한다.
- 새 공통 UI primitive는 추가하지 않는다.
- 도메인 전용 하위 컴포넌트는 기존 `resume-question-chat.tsx` 안에서 유지하되, 반복 표시와 상태별 UI는 작은 함수형 컴포넌트로 나눈다.
- lucide icon은 이미 사용 중인 아이콘과 같은 방식으로 사용한다.

## 데이터 흐름

```txt
추천 질문 선택
-> textarea 값 설정
-> 사용자가 전송 클릭
-> askResumeRag({ question, locale })
-> 답변 메시지 추가
-> grounded/source 상태 렌더링
```

API 계약은 바꾸지 않는다. 이번 작업은 웹 UI와 웹 E2E 범위만 다룬다.

## 오류 처리

- `403`: origin 차단 안내, 재시도 버튼 없음
- `429`: rate limit 안내, 재시도 버튼 있음
- `503`: Codex/app-server 준비 실패 안내, 재시도 버튼 있음
- contract 오류: 응답 형식 오류 안내, 재시도 버튼 있음
- 기타 요청 오류: 네트워크/API 오류 안내, 재시도 버튼 있음

## 테스트 기준

- 비로그인 방문자가 textarea, 추천 질문, 전송 버튼을 볼 수 있어야 한다.
- 추천 질문을 누르면 textarea가 해당 질문으로 채워져야 한다.
- 공개 API 호출에는 `authorization` 헤더가 없어야 한다.
- API 응답 후 답변과 근거 block이 보여야 한다.
- CSP에 `connect-src`와 운영 API origin이 포함되어야 한다.
- 운영 배포 후 실제 페이지에서 질문을 보내 답변과 근거가 렌더링되는지 확인한다.
