import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readPost = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("흐름 중심 블로그 글은 Mermaid 다이어그램을 제공한다", () => {
  const resumeRag = readPost("./journal/resume-rag-chat-design-decisions.tsx");
  const routing = readPost("./journal/fixing-routing-redirects.tsx");
  const workflow = readPost("./dev/click-antigravity-workflow.tsx");
  const skills = readPost("./dev/introducing-skills-to-antigravity.tsx");
  const game = readPost("./journal/game-dev-log.tsx");
  const login = readPost("./dev/typescript-express-login-2.tsx");

  assert.equal((resumeRag.match(/<MermaidDiagram/g) ?? []).length, 5);
  assert.match(resumeRag, /flowchart LR/);
  assert.match(resumeRag, /flowchart TD/);
  assert.match(routing, /<MermaidDiagram/);
  assert.match(routing, /flowchart LR/);
  assert.match(routing, /router\.push\(\\'\/game\\'\)/);
  assert.match(workflow, /<MermaidDiagram/);
  assert.match(workflow, /flowchart LR/);
  assert.match(skills, /<MermaidDiagram/);
  assert.match(skills, /flowchart LR/);
  assert.match(skills, /Progressive Disclosure|점진적 공개/);
  assert.match(game, /<MermaidDiagram/);
  assert.match(game, /sequenceDiagram/);
  assert.match(login, /<MermaidDiagram/);
  assert.match(login, /sequenceDiagram/);
  assert.match(login, /session ID 재발급/);
});
