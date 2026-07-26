import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getBlogPostDefinition } from "./blog-post-registry";

const readPost = (name: string) =>
  readFileSync(new URL(`./dev/${name}.tsx`, import.meta.url), "utf8");

test("P0 글에서 위험하거나 틀린 예제를 제거한다", () => {
  const mysql = readPost("centos8-mysql-install");
  const sessionOne = readPost("typescript-express-login-1");
  const sessionTwo = readPost("typescript-express-login-2");
  const sessionThree = readPost("typescript-express-login-3");
  const setup = readPost("typescript-express-setup");

  assert.doesNotMatch(mysql, /CREATE DATABASE '사용할 DB 이름'/);
  assert.doesNotMatch(mysql, /'%' identified by/);
  assert.doesNotMatch(mysql, /grant all privileges/i);
  assert.match(mysql, /GRANT SELECT, INSERT, UPDATE, DELETE/);

  assert.doesNotMatch(sessionOne, /saveUninitialized: true/);
  assert.match(sessionOne, /saveUninitialized: false/);
  assert.match(sessionTwo, /req\.session\.regenerate/);
  assert.doesNotMatch(sessionThree, /나노초/);
  assert.match(sessionThree, /fourteenDaysInMs/);

  assert.doesNotMatch(setup, /Set-ExecutionPolicy Unrestricted/);
  assert.match(setup, /tsx watch src\/server\.ts/);
});

test("React Server Components 보안 글은 2025년 12월 대응 정보를 제공한다", () => {
  const securityPost = getBlogPostDefinition("dev/react-nextjs-security-2025");
  const securitySource = readPost("react-nextjs-security-2025");

  assert.equal(securityPost?.date, "2025-12-11");
  assert.match(securitySource, /CVE-2025-67779/);
  assert.match(securitySource, /fix-react2shell-next/);
});
