# Task 6 Report: Socket.IO Room Sync With REST Recovery

Date: 2026-07-11
Status: DONE_WITH_CONCERNS

## Implemented

- Added the Nest Socket.IO `/poke-lounge` namespace and a committed-room event
  service wired to the Task 5 post-transaction publisher boundary.
- `room.subscribe` validates a normalized room code, bounded participant/session
  identity, and safe revision cursor, then authorizes against the durable private
  participant session before joining `room:<roomCode>`.
- Gateway payloads contain only public room snapshots. Subscription failures use
  one generic response and cursor regression removes the socket from its previous
  Poke Lounge room before requiring a fresh session.
- Replaced unconditional 750 ms polling with one socket per live room identity,
  reconnect subscription plus one immediate REST recovery, and bounded
  exponential recovery while disconnected or subscription-failed (250 ms to
  5 seconds).
- All REST and Socket.IO snapshots pass through one revision gate. Lower
  revisions and wrong-room snapshots are ignored.
- REST mutations use UUID idempotency keys and `If-Match-Revision`. A network
  failure retries the exact request once with the same body/key/revision. HTTP
  409 snapshots are gated but the command is not automatically replayed.
- Transport disconnect does not leave the durable room. Explicit `dispose()`
  disconnects the socket, removes listeners, and sends the existing REST leave.
- The socket factory override is available only through the `e2e=1` browser test
  seam; it is not part of `ServerRoomOptions` runtime API.
- Added optional `afterRevision` validation/documentation to the REST GET cursor.

## Focused E2E Failures Found And Fixed

The first inherited focused run completed with 16 passing and 2 failing cases.

1. A stale-conflict test expected a POST that started before a newer socket
   snapshot to already contain the newer revision. The test ordering was wrong.
   It now proves the in-flight command keeps its authored revision, the delayed
   lower 409 snapshot cannot roll state back, no automatic replay occurs, and the
   next caller-authored command uses the accepted socket revision.
2. A legacy test expected a second REST join from a repeated `room.connect()`.
   Task 6 requires one live socket/connect per identity. `connect()` is now
   idempotent and the test asserts no extra join or socket is created.

The earlier implementation also automatically replayed revision-conflicted
commands. This violated the Task 6 preflight rule that a 409 requires caller
reconciliation. The replay path was removed; only network failures retry.

## Dependency And Lockfile Review

- API runtime: `@nestjs/platform-socket.io`, `@nestjs/websockets`.
- API dev test client and web runtime: `socket.io-client`.
- Regenerated with repository pnpm `9.12.0`, then restored the repository's
  Prettier YAML representation.
- Final lockfile diff is 271 additions and 6 replaced peer-resolution lines.
  The only unrelated prune candidate (`ts-loader`) was retained.
- `pnpm install --lockfile-only --frozen-lockfile` passed before the final
  representation-only Prettier pass.

## Verification

- `pnpm test:api`: PASS, 39 suites / 235 tests.
- `pnpm --filter @vscoke/api lint`: PASS.
- `pnpm type:check:web`: PASS.
- `pnpm lint:web`: PASS.
- `pnpm --filter @vscoke/web e2e -- tests/e2e/poke-lounge-multiplayer.spec.ts --project=chromium`:
  PASS, 18 Chromium tests.
- `pnpm build`: PASS (web and API).
- `pnpm build:api`: PASS (explicit follow-up evidence).
- `git diff --check`: PASS.

## Remaining Verification Concern

`pnpm --filter @vscoke/api test:e2e -- poke-lounge-room.e2e-spec.ts --runInBand`
was invoked but stopped before application/database initialization with
`TEST_DATABASE_URL is required for PostgreSQL tests`. This worktree has no
explicit disposable `_test` PostgreSQL URL, matching the Task 5 local safety
constraint. The Socket.IO PostgreSQL E2E cases remain pending an explicit test
database or the repository PostgreSQL 16 CI job; no fake repository fallback was
introduced.
