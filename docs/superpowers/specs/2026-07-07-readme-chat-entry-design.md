# README Chat Entry Design

## Goal

README 페이지에서 이력 질문을 바로 남길 수 있게 하고, 답변이 준비되면 사용자가 질문 페이지로 이동해 완성된 대화 기록을 즉시 볼 수 있게 한다.

## Scope

- 대상 진입점: `/:locale/readme`
- 대상 결과 페이지: `/:locale/resume/question`
- 저장 방식: 브라우저 `sessionStorage`
- API 계약: 기존 `POST /resume-rag/chat` 유지
- 백엔드, DB, 서버 저장형 채팅방, SharedWorker는 이번 범위에서 제외한다.

## User Flow

1. README 하단 고정 플로팅 입력에서 질문을 입력한다.
2. 제출하면 클라이언트에서 `crypto.randomUUID()`로 `chatId`를 만든다.
3. README 화면에서 기존 resume RAG API 요청을 시작하고 부분 로더를 보여준다.
4. 응답 성공 시 `{ chatId, question, answer, grounded, sources }`를 `sessionStorage`에 저장한다.
5. 플로팅 입력은 `답변 보러가기` 상태로 바뀐다.
6. 버튼을 누르면 `/resume/question?chatId=<id>`로 이동한다.
7. 질문 페이지는 `chatId` 기록이 있으면 기존 채팅 UI에 사용자 질문과 답변을 즉시 렌더링한다.
8. 기록이 없거나 파싱할 수 없으면 기존 빈 질문 화면으로 fallback한다.

## UI

- 기존 VSCode 스타일을 유지한다.
- shadcn/ui `Button`, `Textarea`를 재사용한다.
- README 플로팅 영역은 어두운 배경, 얇은 border, `blue-300` 액센트, `yellow-200` 준비 완료 톤을 사용한다.
- 모바일에서는 화면 하단 폭을 좁게 유지하고, 본문을 과하게 가리지 않도록 최대 폭을 둔다.

## Data Contract

`sessionStorage` key:

```txt
vscoke.resumeRag.chat.<chatId>
```

Value:

```ts
type StoredResumeRagChat = {
  id: string;
  question: string;
  answer: string;
  grounded: boolean;
  sources: ResumeRagSource[];
  createdAt: number;
};
```

## Error Handling

- README API 요청 실패 시 플로팅 입력 안에 짧은 실패 문구와 재시도 버튼을 보여준다.
- 질문이 비어 있거나 2자 미만이면 제출하지 않는다.
- 질문 페이지에서 `chatId` 기록이 없으면 기존 추천 질문 UI를 그대로 보여준다.
- `sessionStorage` 접근이 막힌 환경에서는 API 응답 후에도 질문 페이지 자동 기록 복원은 포기하고 기존 입력 흐름으로 fallback한다.

## Testing

- Playwright로 README 플로팅 입력이 비로그인 상태에서도 보이는지 확인한다.
- README에서 질문 제출 후 API 응답을 mock하고 `답변 보러가기`가 나타나는지 확인한다.
- `답변 보러가기` 클릭 후 질문 페이지에서 저장된 질문, 답변, 근거가 즉시 렌더링되는지 확인한다.
- 기존 resume RAG 질문 페이지 테스트는 계속 통과해야 한다.
