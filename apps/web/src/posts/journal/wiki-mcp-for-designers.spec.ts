import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./wiki-mcp-for-designers.tsx", import.meta.url), "utf8");

test("Wiki MCP 글은 네 흐름을 Mermaid로 표현한다", () => {
  assert.equal((source.match(/<MermaidDiagram/g) ?? []).length, 4);
  assert.match(source, /flowchart LR/);
  assert.match(source, /flowchart TD/);
  assert.match(source, /sequenceDiagram/);
});
