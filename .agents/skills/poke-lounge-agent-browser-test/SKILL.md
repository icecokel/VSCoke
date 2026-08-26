---
name: poke-lounge-agent-browser-test
description: Run or coordinate agent-operated Poke Lounge browser playtests with Vercel agent-browser. Use whenever an agent is asked to play, test, diagnose, capture, or complete a Poke Lounge browser cycle in local, integration, or production environments. Do not use for unit or API-only tests that never operate a browser.
---

# Poke Lounge Agent Browser Test

Use Vercel Labs `agent-browser` as the default browser driver for agent-operated Poke Lounge tests.
Keep existing Playwright specs and their official runner for scripted regression; do not translate or replace
them unless the user asks.

## Before browser work

1. Read `docs/poke-lounge-multiplayer-test-scenarios.md` completely. It is the acceptance-test source of
   truth. Treat Playwright-specific implementation notes as scripted-suite guidance while preserving their
   observable acceptance criteria.
2. Run `agent-browser --version` and `agent-browser skills get core --full` before the first browser command.
3. If the CLI or its Chrome installation is unavailable, report `INFRA-BLOCKED`; do not silently substitute
   the Codex browser, the user's Chrome profile, or Playwright for an agent-operated playtest.

## Browser policy

- Run headless by default. Use `--headed` only when the user requests it or when a captured failure cannot be
  diagnosed headlessly.
- Give every player a unique named session such as `poke-<run-id>-mp1`. Never use the shared default session,
  reuse another player's session, or use `close --all`.
- Use headless Chromium for both environments. Assign Desktop Web `1440x900` or Mobile Web `390x844` from the
  recorded random seed. Apply Desktop with `set viewport 1440 900`. For Mobile, launch the blank named session
  with `open --init-script .agents/skills/poke-lounge-agent-browser-test/scripts/mobile-touch-init.js`, apply
  `set device "iPhone 12"`, then open the target URL. Verify viewport `390x844` and
  `navigator.maxTouchPoints > 0` before room entry. Firefox is excluded. A narrow viewport without the reviewed
  touch init script is not Mobile Web and must not report `ENV-READY`.
- Open settings and turn sound off in every player session before room entry. Report `AUDIO-MUTED <MP role>`
  only after verifying that session's control state.
- The orchestrator does not occupy a player session unless the user explicitly asks it to play. One runner may
  own multiple named sessions when the requested player count exceeds the available agent concurrency.

## Execution

1. Use the snapshot-and-ref loop and take a fresh `snapshot -i` after navigation, scene changes, dialogs, or
   dynamic rerenders. Prefer roles and accessible names over CSS selectors.
2. Wait on visible UI, URL, network, or server-authoritative state. Do not use arbitrary fixed sleeps in place
   of readiness, room revision, round, match, phase, or turn conditions.
3. Drive every player through the public UI. Do not call internal APIs to force readiness, combat actions,
   results, rankings, or a winner.
4. Store screenshots and diagnostic artifacts under `output/agent-browser/poke-lounge/<run-id>/`; include the
   MP role, environment, checkpoint, and timestamp in filenames. Never record raw passwords, session IDs,
   cookies, tokens, or full Socket payloads.
5. Inspect `console`, `errors`, and relevant `network requests` at failures and before the final verdict. A
   one-cycle test ends only after the server-confirmed winner and rankings converge across every player, each
   player leaves through the UI, and the room reaches the documented cleanup state. Do not add an overall test
   timeout that shortens product deadlines.
6. Read authoritative room fields from browser-completed request/response detail as documented in the canonical
   scenario. This is passive inspection: do not issue `fetch`, replay a request, or route/mock it. If the latest
   projection is missing, reload the UI once within the reconnect grace and inspect the page's automatic room GET.
   When a visible, enabled result control still requires canonical confirmation, do not reload: capture and confirm
   it exactly once, wait for the stable post-transition scene, and only then use the one allowed reload if evidence
   is still missing. Report only the documented field whitelist; never save the full response or sensitive identity
   values.
7. After each battle UI procedure, watch up to five seconds for its `session-actions` request. If no request appears,
   capture the current phase and focus, then repeat the complete UI procedure exactly once; do not wait passively for
   the turn deadline. If the retry also emits no request, report `CODE-FAIL`. After any 2xx, never retry that turn.
8. On `DOC-GAP`, `CODE-FAIL`, `TEST-RUNNER`, or `INFRA-BLOCKED`, preserve safe evidence and report the
   classification. Resume only from a documented safe checkpoint; never fabricate progress.

Close only the named sessions created by the run after in-game cleanup is complete. Report environment
assignments, checkpoints, winner and rankings, connection recovery, captured evidence, and defects as one final
result.
