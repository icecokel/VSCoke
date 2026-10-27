import assert from "node:assert/strict";
import test from "node:test";
import { getResumeKey, resumePath } from "./resume-selection";
import { resumePdfFileName } from "@/features/resume-preview/lib/resume-pdf";
import { resumeConversationStorageKey } from "@/features/resume-rag/lib/resume-conversation-client";
import { createResumeRagChatStorageKey } from "@/features/resume-rag/lib/resume-rag-chat-storage";

test("생략만 PE를 선택하고 명시한 key를 URL과 PDF에 유지한다", () => {
  assert.equal(getResumeKey(undefined), "pe");
  assert.equal(getResumeKey(""), "");
  assert.equal(getResumeKey(["nexon", "pe"]), "");
  assert.equal(
    resumePath("/resume/question?chatId=chat", "nexon"),
    "/resume/question?chatId=chat&resume=nexon",
  );
  assert.equal(
    resumePdfFileName("nexon", "ja-JP", true),
    "sangmin-lee-resume-nexon-ja-JP-with-career-details.pdf",
  );
});

test("문서와 언어를 전환하면 대화 저장소를 공유하지 않는다", () => {
  assert.equal(
    resumeConversationStorageKey("main", "en-US", "fe"),
    resumeConversationStorageKey("main", "en-US"),
  );
  assert.equal(
    resumeConversationStorageKey("resume", "ko-KR"),
    "vscoke.conversation.v1.resume.ko-KR",
  );
  assert.notEqual(
    resumeConversationStorageKey("resume", "ko-KR", "fe"),
    resumeConversationStorageKey("resume", "ko-KR", "pe"),
  );
  assert.notEqual(
    createResumeRagChatStorageKey("chat", "fe", "en-US"),
    createResumeRagChatStorageKey("chat", "pe", "en-US"),
  );
  assert.notEqual(
    createResumeRagChatStorageKey("chat", "fe", "en-US"),
    createResumeRagChatStorageKey("chat", "fe", "ko-KR"),
  );
});
