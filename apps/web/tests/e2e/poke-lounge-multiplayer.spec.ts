import { expect, type Browser, type Page, type Request, test } from "@playwright/test";
import { gotoWithRetry } from "./test-helpers";

type PokeLoungeWindow = Window & {
  __POKE_LOUNGE_E2E__?: {
    getRoomSnapshot(): {
      roomId: string | null;
      sessionId: string | null;
    };
    getGameStateSnapshot(): {
      currentPlayerId: string;
      round: {
        phase: string;
      };
    };
  };
  __POKE_LOUNGE_SOCKET_TEST__?: PokeLoungeSocketTestControl;
};

interface PokeLoungeSocketTestControl {
  createdCount(): number;
  connected(): boolean;
  disconnect(): void;
  emitRevisionConflict(room: unknown): void;
  emitSnapshot(room: unknown): void;
  emitSubscriptionError(): void;
  reconnect(): void;
  subscriptions(): Array<{
    roomCode: string;
    playerId: string;
    sessionId: string;
    afterRevision: number;
  }>;
  transportErrors(): string[];
}

const LOCALE = "ko-KR";
const ROOM_CODE = "SRV001";
const ROOM_EXPIRES_AT_MS = 253402300799999;

test.describe("Poke Lounge server multiplayer", () => {
  test("network=server room은 wrapped 서버 상태의 final score를 서버 확정 점수로 사용한다", async ({
    page,
  }) => {
    const server = createMockServerState();

    await mockServerRoom(page, server, { wrapped: true });
    await startServerRoom(page);

    await expect
      .poll(() => getRoomSnapshot(page).then(snapshot => snapshot?.roomId ?? null), {
        timeout: 30000,
      })
      .toBe(ROOM_CODE);
    await expect(page.getByTestId("poke-lounge-result-score")).toHaveText("100", {
      timeout: 30000,
    });
    expect(await getRoundPhase(page)).toBe("game-result");

    expect(server.calls).toContain(`POST /poke-lounge/rooms/${ROOM_CODE}/join`);
    await expect
      .poll(() =>
        Promise.resolve(server.calls.includes(`POST /poke-lounge/rooms/${ROOM_CODE}/ready`)),
      )
      .toBe(true);
  });

  test("server room이 completed 전이면 GET polling으로 최신 상태를 반영한다", async ({ page }) => {
    const server = createMockServerState();

    await mockServerRoom(page, server, { completeOnGet: true, wrapped: true });
    await startServerRoom(page);

    await expect
      .poll(() => Promise.resolve(server.calls), { timeout: 30000 })
      .toContain(`GET /poke-lounge/rooms/${ROOM_CODE}`);
    await expect(page.getByTestId("poke-lounge-result-score")).toHaveText("100", {
      timeout: 30000,
    });
  });

  test("newer socket revision은 지연된 stale REST recovery보다 우선한다", async ({ page }) => {
    const server = createMockServerState();

    await mockServerRoom(page, server, {
      deferRecoveryGet: true,
      recoveryGetRevision: 99,
      waitForResult: true,
      wrapped: true,
    });
    await startServerRoom(page);
    await expect.poll(() => getSocketState(page).then(state => state.createdCount)).toBe(1);
    await expect.poll(() => Promise.resolve(server.recoveryAfterRevisions.length)).toBe(1);

    server.revision = 100;
    await emitSocketSnapshot(page, createCompletedRoomState(server));
    server.resolveRecoveryGet?.();
    await expect(page.getByTestId("poke-lounge-result-score")).toHaveText("100", {
      timeout: 5000,
    });

    const requestCount = server.commandRequests.length;
    await sendPartySnapshot(page);
    await expect
      .poll(() => Promise.resolve(server.commandRequests.length))
      .toBeGreaterThan(requestCount);
    expect(server.commandRequests.at(-1)?.revision).toBe("100");
  });

  test("disconnect와 reconnect는 한 socket에서 REST recovery와 재구독을 수행한다", async ({
    page,
  }) => {
    const server = createMockServerState();

    await mockServerRoom(page, server, { waitForResult: true, wrapped: true });
    await startServerRoom(page);
    await expect.poll(() => getSocketState(page).then(state => state.subscriptions.length)).toBe(1);

    await emitSocketSnapshot(page, createTournamentRoomState(server));
    const recoveryBeforeDisconnect = server.recoveryAfterRevisions.length;
    await disconnectSocket(page);
    await expect
      .poll(() => Promise.resolve(server.recoveryAfterRevisions.length), { timeout: 3000 })
      .toBeGreaterThan(recoveryBeforeDisconnect);
    expect(server.calls).not.toContain(`POST /poke-lounge/rooms/${ROOM_CODE}/leave`);

    await reconnectSocket(page);
    await expect.poll(() => getSocketState(page).then(state => state.subscriptions.length)).toBe(2);
    await expect.poll(() => getSocketState(page).then(state => state.createdCount)).toBe(1);
    expect((await getSocketState(page)).subscriptions.at(-1)?.afterRevision).toBe(server.revision);

    server.revision += 1;
    await emitSocketSnapshot(page, createTournamentRoomState(server));
    const recoveryAfterSubscribedSnapshot = server.recoveryAfterRevisions.length;
    await page.waitForTimeout(750);
    expect(server.recoveryAfterRevisions).toHaveLength(recoveryAfterSubscribedSnapshot);
  });

  test("subscription 실패 recovery는 유효한 snapshot에서 timer를 정리한다", async ({ page }) => {
    const server = createMockServerState();

    await mockServerRoom(page, server, { waitForResult: true, wrapped: true });
    await startServerRoom(page);
    await expect.poll(() => getSocketState(page).then(state => state.connected)).toBe(true);
    const recoveryBeforeFailure = server.recoveryAfterRevisions.length;

    await emitSocketSubscriptionError(page);
    await expect
      .poll(() => Promise.resolve(server.recoveryAfterRevisions.length), { timeout: 3000 })
      .toBeGreaterThan(recoveryBeforeFailure);
    await emitSocketSnapshot(page, createTournamentRoomState(server));
    await page.waitForTimeout(300);
    const recoveryAfterSnapshot = server.recoveryAfterRevisions.length;
    await page.waitForTimeout(750);

    expect(server.recoveryAfterRevisions).toHaveLength(recoveryAfterSnapshot);
  });

  test("cursor regression은 lower snapshot을 적용하지 않고 recovery를 중단한다", async ({
    page,
  }) => {
    const server = createMockServerState();

    await mockServerRoom(page, server, { waitForResult: true, wrapped: true });
    await startServerRoom(page);
    await expect.poll(() => getSocketState(page).then(state => state.connected)).toBe(true);
    server.revision = 20;
    await emitSocketSnapshot(page, createCompletedRoomState(server));
    await emitSocketRevisionConflict(page, {
      ...createTournamentRoomState(server),
      revision: 19,
    });

    await expect.poll(() => getSocketState(page).then(state => state.connected)).toBe(false);
    await expect
      .poll(() => getSocketState(page).then(state => state.transportErrors.join("\n")))
      .toContain("fresh room session");
    const recoveryAfterConflict = server.recoveryAfterRevisions.length;
    await page.waitForTimeout(750);
    expect(server.recoveryAfterRevisions).toHaveLength(recoveryAfterConflict);
    await expect(page.getByTestId("poke-lounge-result-score")).toHaveText("100");
  });

  test("server room result submit이 거부되면 클라이언트는 토너먼트 결과를 임의 성공 처리하지 않는다", async ({
    page,
  }) => {
    const server = createMockServerState();

    await mockServerRoom(page, server, { rejectResult: true });
    await startServerRoom(page);
    await expect
      .poll(() =>
        Promise.resolve(server.calls.includes(`POST /poke-lounge/rooms/${ROOM_CODE}/ready`)),
      )
      .toBe(true);

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("poke-lounge:e2e-server-result", {
          detail: {
            matchId: "round-1-match-1",
            winnerPlayerId: "player-1",
            loserPlayerId: "player-2",
            reason: "faint",
          },
        }),
      );
    });

    await expect(page.getByTestId("poke-lounge-result-panel")).toBeHidden({ timeout: 3000 });
    await expect
      .poll(() => getRoundPhase(page), {
        timeout: 3000,
      })
      .not.toBe("game-result");
    expect(server.calls).toContain(`POST /poke-lounge/rooms/${ROOM_CODE}/result`);
  });

  test("server room result submit은 로컬 player id를 서버 participant id로 변환한다", async ({
    page,
  }) => {
    const server = createMockServerState();

    await mockServerRoom(page, server, { waitForResult: true, wrapped: true });
    await startServerRoom(
      page,
      `/${LOCALE}/game/poke-lounge?network=server&room=${ROOM_CODE}&serverPlayerId=server-player-alpha&serverSessionId=server-session-alpha&e2e=1`,
    );
    await expect
      .poll(() => Promise.resolve(server.joinedParticipants.length), { timeout: 30000 })
      .toBeGreaterThanOrEqual(1);
    await expect
      .poll(() =>
        Promise.resolve(server.calls.includes(`POST /poke-lounge/rooms/${ROOM_CODE}/ready`)),
      )
      .toBe(true);

    const localPlayerId = await getCurrentPlayerId(page);
    const [joinedParticipant] = server.joinedParticipants;

    expect(joinedParticipant).toMatchObject({
      playerId: "server-player-alpha",
      sessionId: "server-session-alpha",
    });
    expect(localPlayerId).not.toBe(joinedParticipant.playerId);

    await page.evaluate((winnerPlayerId: string) => {
      window.dispatchEvent(
        new CustomEvent("poke-lounge:e2e-server-result", {
          detail: {
            matchId: "round-1-match-1",
            winnerPlayerId,
            reason: "faint",
          },
        }),
      );
    }, localPlayerId ?? "player-1");

    await expect
      .poll(() => Promise.resolve(server.resultBodies.length), { timeout: 30000 })
      .toBe(1);
    expect(server.resultBodies[0]).toMatchObject({
      reportingPlayerId: joinedParticipant.playerId,
      reportingSessionId: joinedParticipant.sessionId,
      winnerPlayerId: joinedParticipant.playerId,
      loserPlayerId: "player-2",
    });
    expect(server.resultAccepted).toBe(true);
    await expect(page.getByTestId("poke-lounge-result-score")).toHaveText("100", {
      timeout: 30000,
    });
  });

  test("server room cleanup은 e2e global 없이도 unmount 시 leave를 전송한다", async ({ page }) => {
    const server = createMockServerState();

    await mockServerRoom(page, server, { waitForResult: true, wrapped: true });
    await startServerRoom(
      page,
      `/${LOCALE}/game/poke-lounge?network=server&room=${ROOM_CODE}&serverPlayerId=server-player-cleanup&serverSessionId=server-session-cleanup&e2e=1`,
    );
    await expect
      .poll(() =>
        Promise.resolve(server.calls.includes(`POST /poke-lounge/rooms/${ROOM_CODE}/ready`)),
      )
      .toBe(true);

    await page.evaluate(() => {
      delete (window as Window & { __POKE_LOUNGE_GAME__?: unknown }).__POKE_LOUNGE_GAME__;
    });

    await page.evaluate(() => {
      (
        window as Window & {
          __POKE_LOUNGE_CLEANUP_FOR_TEST__?: () => void;
        }
      ).__POKE_LOUNGE_CLEANUP_FOR_TEST__?.();
    });

    await expect
      .poll(
        () => Promise.resolve(server.calls.includes(`POST /poke-lounge/rooms/${ROOM_CODE}/leave`)),
        { timeout: 5000 },
      )
      .toBe(true);
  });

  test("create 응답 전 dispose는 pending leave 없이 실제 방에 한 번만 leave를 전송한다", async ({
    page,
  }) => {
    const server = createMockServerState();

    await mockServerRoom(page, server, {
      deferCreateResponse: true,
      waitForResult: true,
      wrapped: true,
    });
    await gotoWithRetry(page, `/${LOCALE}/game/poke-lounge?e2e=1`);
    await page.locator("[data-room-entry-server-create]").click();
    await chooseStarterIfNeeded(page);
    await expect.poll(() => Promise.resolve(server.createRequestReceived)).toBe(true);

    await disposeServerRoom(page);
    expect(server.calls).not.toContain("POST /poke-lounge/rooms/server-pending/leave");

    server.resolveCreateResponse?.();
    await expect
      .poll(
        () =>
          Promise.resolve(
            server.calls.filter(call => call === `POST /poke-lounge/rooms/${ROOM_CODE}/leave`)
              .length,
          ),
        { timeout: 5000 },
      )
      .toBe(1);
    await page.waitForTimeout(1000);

    expect(server.calls).not.toContain(`POST /poke-lounge/rooms/${ROOM_CODE}/party-snapshot`);
    expect(server.calls).not.toContain(`POST /poke-lounge/rooms/${ROOM_CODE}/ready`);
    expect(server.calls).not.toContain(`GET /poke-lounge/rooms/${ROOM_CODE}`);
  });

  test("server room create는 URL을 room code로 갱신하고 join input으로 참가한 두 컨텍스트는 서로 다른 identity를 유지한다", async ({
    browser,
  }) => {
    const server = createMockServerState();
    const hostPage = await newMockedPage(browser, server, { wrapped: true });
    const guestPage = await newMockedPage(browser, server, { wrapped: true });

    await gotoWithRetry(hostPage, `/${LOCALE}/game/poke-lounge?e2e=1`);
    await expect(hostPage.locator("[data-room-entry-screen='true']")).toBeVisible({
      timeout: 30000,
    });
    await hostPage.locator("[data-room-entry-server-create]").click();
    await chooseStarterIfNeeded(hostPage);
    await expectServerRoomUrl(hostPage);
    await expect
      .poll(() => getRoomSnapshot(hostPage).then(snapshot => snapshot?.roomId ?? null), {
        timeout: 30000,
      })
      .toBe(ROOM_CODE);

    await gotoWithRetry(guestPage, `/${LOCALE}/game/poke-lounge?e2e=1`);
    await expect(guestPage.locator("[data-room-entry-screen='true']")).toBeVisible({
      timeout: 30000,
    });
    await guestPage.locator("[data-room-entry-server-code]").fill("srv001");
    await guestPage.locator("[data-room-entry-server-join]").click();
    await expectServerRoomUrl(guestPage);
    await chooseStarterIfNeeded(guestPage);
    await expect
      .poll(() => getRoomSnapshot(guestPage).then(snapshot => snapshot?.roomId ?? null), {
        timeout: 30000,
      })
      .toBe(ROOM_CODE);

    await expect.poll(() => Promise.resolve(server.joinedPlayerIds.size)).toBe(2);
    await expect.poll(() => Promise.resolve(server.joinedSessionIds.size)).toBe(2);

    const [hostSessionId, guestSessionId] = await Promise.all([
      getRoomSnapshot(hostPage).then(snapshot => snapshot?.sessionId ?? null),
      getRoomSnapshot(guestPage).then(snapshot => snapshot?.sessionId ?? null),
    ]);

    expect(hostSessionId).not.toBe(guestSessionId);
    expect(server.joinedParticipants).toHaveLength(2);
    expect(server.joinedParticipants[0]?.sessionId).not.toBe(
      server.joinedParticipants[1]?.sessionId,
    );
    expect(server.joinedParticipants[0]?.playerId).not.toBe(server.joinedParticipants[1]?.playerId);

    await hostPage.context().close();
    await guestPage.context().close();
  });

  test("server room은 connect 시점과 로컬 파티 변경 시점에 party snapshot을 전송한다", async ({
    page,
  }) => {
    const server = createMockServerState();

    await mockServerRoom(page, server, { wrapped: true });
    await startServerRoom(page);

    await page.evaluate(() => {
      const game = (window as Window & { __POKE_LOUNGE_GAME__?: unknown }).__POKE_LOUNGE_GAME__ as {
        scene?: {
          getScene?: (key: string) => {
            createLocalPlayerSnapshot?: () => unknown;
            sendRoomMessage?: (type: "PLAYER_CHANGED_MAP", payload: unknown) => void;
            closeShortcutGuideForTest?: () => void;
            player?: { body?: { velocity?: { x: number; y: number } } };
            roomConnected?: boolean;
            gameStateStore?: {
              getState: () => {
                currentPlayerId: string;
                playersById: Record<
                  string,
                  {
                    activePartySlotIndex: number;
                    party: Array<{
                      pokemon: {
                        speciesId: number;
                        name: string;
                        level: number;
                      } | null;
                    }>;
                  }
                >;
              };
            };
          };
        };
      };
      const worldScene = game.scene?.getScene?.("world");

      if (!worldScene?.createLocalPlayerSnapshot || !worldScene.sendRoomMessage) {
        return;
      }

      worldScene.closeShortcutGuideForTest?.();
      const snapshot = worldScene.createLocalPlayerSnapshot() as {
        activePartySlotIndex?: number;
        party?: Array<{
          slotIndex: number;
          pokemon: {
            speciesId: number;
            name: string;
            level: number;
            currentHp: number;
            maxHp: number;
          } | null;
        }>;
      };

      worldScene.sendRoomMessage("PLAYER_CHANGED_MAP", {
        ...snapshot,
        activePartySlotIndex: 0,
        party: [
          {
            slotIndex: 0,
            pokemon: {
              speciesId: 25,
              name: "Pikachu",
              level: 12,
              currentHp: 18,
              maxHp: 30,
            },
          },
        ],
      });
    });

    await expect
      .poll(() =>
        Promise.resolve(
          server.calls.filter(
            call => call === `POST /poke-lounge/rooms/${ROOM_CODE}/party-snapshot`,
          ).length,
        ),
      )
      .toBeGreaterThanOrEqual(2);

    const snapshotWithRepresentativePokemon = server.partySnapshotBodies.find(
      body => body.representativePokemon,
    );

    expect(snapshotWithRepresentativePokemon).toMatchObject({
      playerId: expect.any(String),
      sessionId: expect.any(String),
      representativePokemon: {
        speciesId: expect.any(Number),
        name: expect.any(String),
        level: expect.any(Number),
        currentHp: expect.any(Number),
        maxHp: expect.any(Number),
      },
    });
  });

  test("server room revision conflict는 snapshot만 반영하고 command를 자동 재시도하지 않는다", async ({
    page,
  }) => {
    const server = createMockServerState();

    await mockServerRoom(page, server, {
      revisionConflictSuffix: "/ready",
      waitForResult: true,
      wrapped: true,
    });
    await startServerRoom(page);

    await expect
      .poll(
        () =>
          Promise.resolve(
            server.commandHeaders.filter(headers => headers.suffix === "/ready").length,
          ),
        { timeout: 30000 },
      )
      .toBe(1);
    await page.waitForTimeout(500);

    const readyHeaders = server.commandHeaders.filter(headers => headers.suffix === "/ready");
    expect(readyHeaders).toHaveLength(1);
    expect(readyHeaders[0].revision).not.toBe(String(server.conflictRevision));
  });

  test("stale conflict snapshot은 최신 socket revision을 덮거나 POST를 재시도하지 않는다", async ({
    page,
  }) => {
    const server = createMockServerState();

    await mockServerRoom(page, server, {
      revisionConflictDelayMs: 1000,
      revisionConflictAttempt: 2,
      revisionConflictSuffix: "/party-snapshot",
      waitForResult: true,
      wrapped: true,
    });
    await startServerRoom(page);
    await expect
      .poll(() =>
        Promise.resolve(server.calls.includes(`POST /poke-lounge/rooms/${ROOM_CODE}/ready`)),
      )
      .toBe(true);
    await page.waitForTimeout(800);
    const partyRequestsBefore = server.commandRequests.filter(
      request => request.suffix === "/party-snapshot",
    ).length;

    await sendPartySnapshot(page);

    await expect
      .poll(
        () =>
          Promise.resolve(
            server.commandRequests.filter(request => request.suffix === "/party-snapshot").length,
          ),
        { timeout: 5000 },
      )
      .toBe(partyRequestsBefore + 1);
    server.revision += 2;
    await emitSocketSnapshot(page, createTournamentRoomState(server));
    const socketRevision = server.revision;
    await page.waitForTimeout(1200);

    const [request] = server.commandRequests
      .filter(request => request.suffix === "/party-snapshot")
      .slice(-1);

    expect(request).toMatchObject({
      method: "POST",
    });
    expect(Number(request.revision)).toBeLessThan(socketRevision);

    const commandCount = server.commandRequests.length;
    await sendPartySnapshot(page);
    await expect
      .poll(() => Promise.resolve(server.commandRequests.length))
      .toBeGreaterThan(commandCount);
    expect(server.commandRequests.at(-1)?.revision).toBe(String(socketRevision));
  });

  test("idempotency conflict snapshot은 적용하고 동일 command를 재시도하지 않는다", async ({
    page,
  }) => {
    const server = createMockServerState();

    await mockServerRoom(page, server, {
      idempotencyConflictSuffix: "/ready",
      waitForResult: true,
      wrapped: true,
    });
    await startServerRoom(page);

    await expect
      .poll(() =>
        Promise.resolve(
          server.commandRequests.filter(request => request.suffix === "/ready").length,
        ),
      )
      .toBe(1);
    await expect(page.getByTestId("poke-lounge-result-score")).toHaveText("100", {
      timeout: 5000,
    });
  });

  test("room connect 재호출은 같은 identity의 join과 socket을 추가 생성하지 않는다", async ({
    page,
  }) => {
    const server = createMockServerState();

    await mockServerRoom(page, server, { waitForResult: true, wrapped: true });
    await startServerRoom(page);
    await expect
      .poll(() =>
        Promise.resolve(server.calls.includes(`POST /poke-lounge/rooms/${ROOM_CODE}/ready`)),
      )
      .toBe(true);
    const joinCount = server.commandHeaders.filter(header => header.suffix === "/join").length;

    expect(await reconnectServerRoom(page)).toBe(true);
    await page.waitForTimeout(500);

    expect(server.commandHeaders.filter(header => header.suffix === "/join")).toHaveLength(
      joinCount,
    );
    expect((await getSocketState(page)).createdCount).toBe(1);
  });

  test("server room network 재시도는 같은 command header를 재사용한다", async ({ page }) => {
    const server = createMockServerState();

    await mockServerRoom(page, server, {
      networkFailureSuffix: "/party-snapshot",
      waitForResult: true,
      wrapped: true,
    });
    await startServerRoom(page);

    await expect
      .poll(
        () =>
          Promise.resolve(
            server.commandHeaders.filter(headers => headers.suffix === "/party-snapshot").length,
          ),
        { timeout: 30000 },
      )
      .toBeGreaterThanOrEqual(2);

    const [first, retry] = server.commandRequests.filter(
      request => request.suffix === "/party-snapshot",
    );
    expect(retry).toMatchObject({
      method: first.method,
      body: first.body,
      idempotencyKey: first.idempotencyKey,
      revision: first.revision,
    });
  });

  test("server room mutation queue는 동시에 발생한 POST를 직렬화한다", async ({ page }) => {
    const server = createMockServerState();

    await mockServerRoom(page, server, {
      mutationDelayMs: 100,
      waitForResult: true,
      wrapped: true,
    });
    await startServerRoom(page);
    await expect.poll(() => Promise.resolve(server.activeMutations), { timeout: 30000 }).toBe(0);
    const initialSnapshots = server.partySnapshotBodies.length;
    server.maxConcurrentMutations = 0;

    await page.evaluate(() => {
      const game = (window as Window & { __POKE_LOUNGE_GAME__?: unknown }).__POKE_LOUNGE_GAME__ as {
        scene?: {
          getScene?: (key: string) => {
            createLocalPlayerSnapshot?: () => unknown;
            sendRoomMessage?: (type: "PLAYER_CHANGED_MAP", payload: unknown) => void;
          };
        };
      };
      const worldScene = game.scene?.getScene?.("world");
      const snapshot = worldScene?.createLocalPlayerSnapshot?.();

      if (!snapshot || !worldScene?.sendRoomMessage) {
        return;
      }

      worldScene.sendRoomMessage("PLAYER_CHANGED_MAP", snapshot);
      worldScene.sendRoomMessage("PLAYER_CHANGED_MAP", snapshot);
    });

    await expect
      .poll(() => Promise.resolve(server.partySnapshotBodies.length), { timeout: 30000 })
      .toBeGreaterThanOrEqual(initialSnapshots + 2);
    expect(server.maxConcurrentMutations).toBe(1);
  });
});

async function startServerRoom(
  page: Page,
  url = `/${LOCALE}/game/poke-lounge?network=server&room=${ROOM_CODE}&e2e=1`,
): Promise<void> {
  await gotoWithRetry(page, url);
  await chooseStarterIfNeeded(page);
  await expect(page.locator("#game-root canvas")).toBeVisible({ timeout: 30000 });
}

async function chooseStarterIfNeeded(page: Page): Promise<void> {
  const starterSelection = page.locator("[data-screen='starter-selection']");
  const gameCanvas = page.locator("#game-root canvas");

  await expect
    .poll(
      async () => {
        if (await starterSelection.isVisible().catch(() => false)) {
          return "starter";
        }

        if (await gameCanvas.isVisible().catch(() => false)) {
          return "canvas";
        }

        return null;
      },
      { timeout: 30000 },
    )
    .not.toBeNull();

  if (await starterSelection.isVisible().catch(() => false)) {
    await page.locator("[data-starter-confirm]").click();
  }
}

async function getRoomSnapshot(
  page: Page,
): Promise<{ roomId: string | null; sessionId: string | null } | null> {
  return page.evaluate(() => {
    const pokeWindow = window as PokeLoungeWindow;

    return pokeWindow.__POKE_LOUNGE_E2E__?.getRoomSnapshot() ?? null;
  });
}

async function getRoundPhase(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const pokeWindow = window as PokeLoungeWindow;

    return pokeWindow.__POKE_LOUNGE_E2E__?.getGameStateSnapshot().round.phase ?? null;
  });
}

async function getCurrentPlayerId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const pokeWindow = window as PokeLoungeWindow;

    return pokeWindow.__POKE_LOUNGE_E2E__?.getGameStateSnapshot().currentPlayerId ?? null;
  });
}

async function disposeServerRoom(page: Page): Promise<void> {
  await page.evaluate(() => {
    const game = (window as Window & { __POKE_LOUNGE_GAME__?: unknown }).__POKE_LOUNGE_GAME__ as {
      scene?: {
        getScene?: (key: string) => {
          room?: { dispose: () => void };
        };
      };
    };

    game.scene?.getScene?.("world")?.room?.dispose();
  });
}

async function sendPartySnapshot(page: Page): Promise<void> {
  await page.evaluate(() => {
    const game = (window as Window & { __POKE_LOUNGE_GAME__?: unknown }).__POKE_LOUNGE_GAME__ as {
      scene?: {
        getScene?: (key: string) => {
          createLocalPlayerSnapshot?: () => unknown;
          sendRoomMessage?: (type: "PLAYER_CHANGED_MAP", payload: unknown) => void;
        };
      };
    };
    const worldScene = game.scene?.getScene?.("world");
    const snapshot = worldScene?.createLocalPlayerSnapshot?.();

    if (snapshot && worldScene?.sendRoomMessage) {
      worldScene.sendRoomMessage("PLAYER_CHANGED_MAP", snapshot);
    }
  });
}

async function reconnectServerRoom(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const game = (window as Window & { __POKE_LOUNGE_GAME__?: unknown }).__POKE_LOUNGE_GAME__ as {
      scene?: {
        getScene?: (key: string) => {
          createLocalPlayerSnapshot?: () => unknown;
          room?: { connect: (snapshot: unknown) => void };
        };
      };
    };
    const worldScene = game.scene?.getScene?.("world");
    const snapshot = worldScene?.createLocalPlayerSnapshot?.();

    if (!snapshot || !worldScene?.room) {
      return false;
    }

    worldScene.room.connect(snapshot);

    return true;
  });
}

async function getSocketState(page: Page): Promise<{
  connected: boolean;
  createdCount: number;
  subscriptions: ReturnType<PokeLoungeSocketTestControl["subscriptions"]>;
  transportErrors: string[];
}> {
  return page.evaluate(() => {
    const control = (window as PokeLoungeWindow).__POKE_LOUNGE_SOCKET_TEST__;

    return {
      connected: control?.connected() ?? false,
      createdCount: control?.createdCount() ?? 0,
      subscriptions: control?.subscriptions() ?? [],
      transportErrors: control?.transportErrors() ?? [],
    };
  });
}

async function emitSocketSnapshot(page: Page, room: unknown): Promise<void> {
  await page.evaluate(value => {
    (window as PokeLoungeWindow).__POKE_LOUNGE_SOCKET_TEST__?.emitSnapshot(value);
  }, room);
}

async function emitSocketRevisionConflict(page: Page, room: unknown): Promise<void> {
  await page.evaluate(value => {
    (window as PokeLoungeWindow).__POKE_LOUNGE_SOCKET_TEST__?.emitRevisionConflict(value);
  }, room);
}

async function emitSocketSubscriptionError(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as PokeLoungeWindow).__POKE_LOUNGE_SOCKET_TEST__?.emitSubscriptionError();
  });
}

async function disconnectSocket(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as PokeLoungeWindow).__POKE_LOUNGE_SOCKET_TEST__?.disconnect();
  });
}

async function reconnectSocket(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as PokeLoungeWindow).__POKE_LOUNGE_SOCKET_TEST__?.reconnect();
  });
}

async function expectServerRoomUrl(page: Page): Promise<void> {
  await expect
    .poll(
      () => {
        const url = new URL(page.url());

        return `${url.searchParams.get("network")}:${url.searchParams.get("room")}`;
      },
      { timeout: 30000 },
    )
    .toBe(`server:${ROOM_CODE}`);
}

async function installSocketFixture(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type Listener = (...args: unknown[]) => void;
    type Subscription = {
      roomCode: string;
      playerId: string;
      sessionId: string;
      afterRevision: number;
    };

    const sockets: FixtureSocket[] = [];
    const subscriptions: Subscription[] = [];
    const transportErrors: string[] = [];
    window.addEventListener("poke-lounge:server-room-error", event => {
      const detail = (event as CustomEvent<{ message?: unknown }>).detail;

      if (typeof detail?.message === "string") {
        transportErrors.push(detail.message);
      }
    });

    class FixtureSocket {
      connected = false;
      private readonly listeners = new Map<string, Set<Listener>>();

      on(eventName: string, listener: Listener): this {
        const eventListeners = this.listeners.get(eventName) ?? new Set<Listener>();
        eventListeners.add(listener);
        this.listeners.set(eventName, eventListeners);
        return this;
      }

      off(eventName: string, listener?: Listener): this {
        if (listener) {
          this.listeners.get(eventName)?.delete(listener);
        } else {
          this.listeners.delete(eventName);
        }
        return this;
      }

      emit(eventName: string, payload?: unknown): this {
        if (eventName === "room.subscribe" && payload && typeof payload === "object") {
          subscriptions.push(structuredClone(payload) as Subscription);
        }
        return this;
      }

      disconnect(): this {
        this.disconnectFromServer("io client disconnect");
        return this;
      }

      connectFromServer(): void {
        if (this.connected) {
          return;
        }
        this.connected = true;
        this.dispatch("connect");
      }

      disconnectFromServer(reason: string): void {
        if (!this.connected) {
          return;
        }
        this.connected = false;
        this.dispatch("disconnect", reason);
      }

      dispatch(eventName: string, ...args: unknown[]): void {
        for (const listener of this.listeners.get(eventName) ?? []) {
          listener(...args);
        }
      }
    }

    const fixtureWindow = window as Window & {
      __POKE_LOUNGE_E2E_SOCKET_FACTORY__?: () => FixtureSocket;
      __POKE_LOUNGE_SOCKET_TEST__?: PokeLoungeSocketTestControl;
    };
    const latestSocket = () => sockets.at(-1);

    fixtureWindow.__POKE_LOUNGE_E2E_SOCKET_FACTORY__ = () => {
      const socket = new FixtureSocket();
      sockets.push(socket);
      queueMicrotask(() => socket.connectFromServer());
      return socket;
    };
    fixtureWindow.__POKE_LOUNGE_SOCKET_TEST__ = {
      createdCount: () => sockets.length,
      connected: () => latestSocket()?.connected ?? false,
      subscriptions: () => structuredClone(subscriptions),
      transportErrors: () => [...transportErrors],
      disconnect: () => latestSocket()?.disconnectFromServer("transport close"),
      reconnect: () => latestSocket()?.connectFromServer(),
      emitSnapshot: room => latestSocket()?.dispatch("room.snapshot", { room }),
      emitRevisionConflict: room => latestSocket()?.dispatch("room.revision-conflict", { room }),
      emitSubscriptionError: () =>
        latestSocket()?.dispatch("room.subscription-error", {
          code: "POKE_LOUNGE_SUBSCRIPTION_REJECTED",
          message: "Poke Lounge room subscription rejected",
        }),
    };
  });
}

async function mockServerRoom(
  page: Page,
  server: MockServerState,
  options: {
    advanceRevisionOnGetAfterConflict?: boolean;
    completeOnGet?: boolean;
    deferCreateResponse?: boolean;
    deferRecoveryGet?: boolean;
    idempotencyConflictSuffix?: string;
    mutationDelayMs?: number;
    networkFailureSuffix?: string;
    rejectResult?: boolean;
    recoveryGetRevision?: number;
    revisionConflictAttempt?: number;
    revisionConflictDelayMs?: number;
    revisionConflictSuffix?: string;
    waitForResult?: boolean;
    wrapped?: boolean;
  } = {},
): Promise<void> {
  await installSocketFixture(page);
  await page.route("**/poke-lounge/rooms**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const suffix = url.pathname.replace(`/poke-lounge/rooms/${ROOM_CODE}`, "");
    const mutation = method === "POST";

    server.calls.push(`${method} ${url.pathname}`);

    const afterRevision = url.searchParams.get("afterRevision");

    if (method === "GET" && afterRevision !== null) {
      server.recoveryAfterRevisions.push(Number(afterRevision));

      if (options.deferRecoveryGet && !server.recoveryGetDeferred) {
        server.recoveryGetDeferred = true;
        await new Promise<void>(resolve => {
          server.resolveRecoveryGet = resolve;
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: stringifyResponse(
            {
              ...createTournamentRoomState(server),
              revision: options.recoveryGetRevision ?? Math.max(0, server.revision - 1),
            },
            options,
          ),
        });
        return;
      }
    }

    if (mutation) {
      const idempotencyKey = request.headers()["x-idempotency-key"];
      const revision = request.headers()["if-match-revision"];

      expect(idempotencyKey).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(revision).toMatch(/^(0|[1-9][0-9]*)$/);
      server.commandHeaders.push({ suffix, idempotencyKey, revision });
      server.commandRequests.push({
        body: request.postData() ?? "",
        idempotencyKey,
        method,
        revision,
        suffix,
      });
      server.activeMutations += 1;
      server.maxConcurrentMutations = Math.max(
        server.maxConcurrentMutations,
        server.activeMutations,
      );

      if (options.mutationDelayMs) {
        await new Promise(resolve => setTimeout(resolve, options.mutationDelayMs));
      }
    }

    try {
      if (mutation && suffix === options.networkFailureSuffix && !server.networkFailureReturned) {
        server.networkFailureReturned = true;
        await route.abort("failed");
        return;
      }

      if (
        mutation &&
        suffix === options.revisionConflictSuffix &&
        server.commandRequests.filter(request => request.suffix === suffix).length ===
          (options.revisionConflictAttempt ?? 1) &&
        !server.revisionConflictReturned
      ) {
        server.revisionConflictReturned = true;
        server.revision += 1;
        server.conflictRevision = server.revision;
        const snapshot = createWaitingRoomState(server);

        if (options.revisionConflictDelayMs) {
          await new Promise(resolve => setTimeout(resolve, options.revisionConflictDelayMs));
        }

        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 409,
            code: "POKE_LOUNGE_REVISION_CONFLICT",
            message: "Poke Lounge room revision conflict",
            snapshot,
          }),
        });
        return;
      }

      if (
        mutation &&
        suffix === options.idempotencyConflictSuffix &&
        !server.idempotencyConflictReturned
      ) {
        server.idempotencyConflictReturned = true;
        server.revision += 1;
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 409,
            code: "POKE_LOUNGE_IDEMPOTENCY_CONFLICT",
            message: "Poke Lounge room idempotency conflict",
            snapshot: createCompletedRoomState(server),
          }),
        });
        return;
      }

      if (method === "POST" && url.pathname === "/poke-lounge/rooms") {
        expect(request.headers()["if-match-revision"]).toBe("0");
        server.revision = 0;
        await recordJoinedIdentity(request, server);
        if (options.deferCreateResponse) {
          server.createRequestReceived = true;
          await new Promise<void>(resolve => {
            server.resolveCreateResponse = resolve;
          });
        }
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: stringifyResponse(createWaitingRoomState(server), options),
        });
        return;
      }

      if (method === "POST" && suffix === "/join") {
        await recordJoinedIdentity(request, server);
      }

      if (method === "POST" && suffix === "/party-snapshot") {
        server.partySnapshotBodies.push(
          (await request.postDataJSON()) as MockServerState["partySnapshotBodies"][number],
        );
      }

      if (method === "POST" && suffix === "/result") {
        const body = (await request.postDataJSON()) as MockServerState["resultBodies"][number];
        server.resultBodies.push(body);
        const resultError = validateResultBody(body, server);

        if (!options.rejectResult && !resultError) {
          server.revision += 1;
        }

        await route.fulfill({
          status: options.rejectResult || resultError ? 400 : 201,
          contentType: "application/json",
          body: stringifyResponse(
            options.rejectResult || resultError
              ? { message: resultError ?? "Invalid match result" }
              : markResultAccepted(server),
            options,
          ),
        });
        return;
      }

      if (mutation) {
        server.revision += 1;
      }

      if (
        method === "GET" &&
        options.advanceRevisionOnGetAfterConflict &&
        server.revisionConflictReturned &&
        !server.concurrentPollRevision
      ) {
        server.revision += 1;
        server.concurrentPollRevision = server.revision;
      }

      let responseState =
        options.advanceRevisionOnGetAfterConflict &&
        method === "GET" &&
        server.concurrentPollRevision
          ? createTournamentRoomState(server)
          : options.rejectResult ||
              (options.completeOnGet && method !== "GET") ||
              (options.waitForResult && !server.resultAccepted)
            ? createTournamentRoomState(server)
            : createCompletedRoomState(server);

      if (method === "GET" && server.returnStaleGet) {
        server.returnStaleGet = false;
        responseState = {
          ...createTournamentRoomState(server),
          revision: Math.max(0, server.revision - 1),
        };
      }

      await route.fulfill({
        status: method === "GET" ? 200 : 201,
        contentType: "application/json",
        body: stringifyResponse(responseState, options),
      });
    } finally {
      if (mutation) {
        server.activeMutations -= 1;
      }
    }
  });
}

async function newMockedPage(
  browser: Browser,
  server: MockServerState,
  options: { wrapped?: boolean } = {},
): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();

  await mockServerRoom(page, server, options);

  return page;
}

interface MockServerState {
  activeMutations: number;
  calls: string[];
  commandRequests: Array<{
    body: string;
    idempotencyKey: string;
    method: string;
    revision: string;
    suffix: string;
  }>;
  commandHeaders: Array<{
    suffix: string;
    idempotencyKey: string;
    revision: string;
  }>;
  conflictRevision: number | null;
  concurrentPollRevision: number | null;
  createRequestReceived: boolean;
  resolveCreateResponse?: () => void;
  idempotencyConflictReturned: boolean;
  maxConcurrentMutations: number;
  networkFailureReturned: boolean;
  recoveryAfterRevisions: number[];
  recoveryGetDeferred: boolean;
  resolveRecoveryGet?: () => void;
  partySnapshotBodies: Array<{
    playerId?: string;
    sessionId?: string;
    displayName?: string;
    representativePokemon?: {
      speciesId: number;
      name: string;
      level: number;
      currentHp: number;
      maxHp: number;
    };
  }>;
  resultBodies: Array<{
    reportingPlayerId?: string;
    reportingSessionId?: string;
    matchId?: string;
    winnerPlayerId?: string;
    loserPlayerId?: string;
    reason?: string;
  }>;
  resultAccepted: boolean;
  revision: number;
  revisionConflictReturned: boolean;
  returnStaleGet: boolean;
  joinedPlayerIds: Set<string>;
  joinedSessionIds: Set<string>;
  joinedParticipants: Array<{
    playerId: string;
    sessionId: string;
    displayName?: string;
    joinedAtMs: number;
  }>;
}

function createMockServerState(): MockServerState {
  return {
    activeMutations: 0,
    calls: [],
    commandRequests: [],
    commandHeaders: [],
    conflictRevision: null,
    concurrentPollRevision: null,
    createRequestReceived: false,
    idempotencyConflictReturned: false,
    maxConcurrentMutations: 0,
    networkFailureReturned: false,
    recoveryAfterRevisions: [],
    recoveryGetDeferred: false,
    partySnapshotBodies: [],
    resultBodies: [],
    resultAccepted: false,
    revision: 0,
    revisionConflictReturned: false,
    returnStaleGet: false,
    joinedPlayerIds: new Set(),
    joinedSessionIds: new Set(),
    joinedParticipants: [],
  };
}

async function recordJoinedIdentity(request: Request, server: MockServerState) {
  const body = (await request.postDataJSON()) as {
    playerId?: string;
    sessionId?: string;
    displayName?: string;
  };

  if (!body.playerId || !body.sessionId) {
    return;
  }

  server.joinedPlayerIds.add(body.playerId);
  server.joinedSessionIds.add(body.sessionId);

  if (!server.joinedParticipants.some(participant => participant.playerId === body.playerId)) {
    server.joinedParticipants.push({
      playerId: body.playerId,
      sessionId: body.sessionId,
      displayName: body.displayName,
      joinedAtMs: server.joinedParticipants.length,
    });
  }
}

function stringifyResponse(value: unknown, options: { wrapped?: boolean }): string {
  return JSON.stringify(options.wrapped ? { success: true, data: value } : value);
}

function markResultAccepted(server: MockServerState) {
  server.resultAccepted = true;

  return createCompletedRoomState(server);
}

function validateResultBody(
  body: MockServerState["resultBodies"][number],
  server: MockServerState,
): string | null {
  const participants = getStateParticipants(server);
  const reporter = participants.find(
    participant => participant.playerId === body.reportingPlayerId,
  );
  const participantIds = new Set(participants.map(participant => participant.playerId));

  if (!reporter || reporter.sessionId !== body.reportingSessionId) {
    return "Invalid reporter";
  }

  if (
    body.matchId !== "round-1-match-1" ||
    !body.winnerPlayerId ||
    !body.loserPlayerId ||
    body.winnerPlayerId === body.loserPlayerId ||
    !participantIds.has(body.winnerPlayerId) ||
    !participantIds.has(body.loserPlayerId)
  ) {
    return "Invalid match participants";
  }

  return null;
}

function createWaitingRoomState(server: MockServerState) {
  return {
    ...createCompletedRoomState(server),
    status: "waiting",
    round: {
      index: 1,
      phase: "waiting",
      durationMs: 1000,
      startedAtMs: null,
      endsAtMs: null,
    },
    tournament: {
      matches: [],
      cumulativeScores: {},
    },
    finalStandings: [],
    partySnapshots: createPartySnapshots(server),
  };
}

function createTournamentRoomState(server: MockServerState) {
  const completed = createCompletedRoomState(server);
  const [first, second] = getStateParticipants(server);

  return {
    ...completed,
    status: "tournament",
    tournament: {
      ...completed.tournament,
      matches: [
        {
          matchId: "round-1-match-1",
          participantIds: [first.playerId, second.playerId],
          status: "pending",
        },
      ],
      cumulativeScores: {},
    },
    finalStandings: [],
    partySnapshots: createPartySnapshots(server),
  };
}

function createCompletedRoomState(server?: MockServerState) {
  const [first, second] = getStateParticipants(server);

  return {
    roomCode: ROOM_CODE,
    revision: server?.revision ?? 0,
    expiresAtMs: ROOM_EXPIRES_AT_MS,
    status: "completed",
    participants: [
      {
        playerId: first.playerId,
        displayName: first.displayName ?? "Player 1",
        role: "participant",
        ready: true,
        connected: true,
        joinedAtMs: first.joinedAtMs,
      },
      {
        playerId: second.playerId,
        displayName: second.displayName ?? "Player 2",
        role: "participant",
        ready: true,
        connected: true,
        joinedAtMs: second.joinedAtMs,
      },
    ],
    partySnapshots: createPartySnapshots(server),
    round: {
      index: 1,
      phase: "tournament",
      durationMs: 1000,
      startedAtMs: 0,
      endsAtMs: 1000,
    },
    tournament: {
      matches: [
        {
          matchId: "round-1-match-1",
          participantIds: [first.playerId, second.playerId],
          status: "completed",
          winnerPlayerId: first.playerId,
          loserPlayerId: second.playerId,
          resultReason: "faint",
        },
      ],
      cumulativeScores: {
        [first.playerId]: 100,
        [second.playerId]: 50,
      },
    },
    finalStandings: [
      {
        playerId: first.playerId,
        displayName: first.displayName ?? "Player 1",
        rank: 1,
        score: 100,
      },
      {
        playerId: second.playerId,
        displayName: second.displayName ?? "Player 2",
        rank: 2,
        score: 50,
      },
    ],
  };
}

function createPartySnapshots(server?: MockServerState) {
  return Object.fromEntries(
    (server?.partySnapshotBodies ?? [])
      .filter(
        (snapshot): snapshot is NonNullable<typeof snapshot> & { playerId: string } =>
          typeof snapshot.playerId === "string" && snapshot.playerId.length > 0,
      )
      .map(snapshot => [
        snapshot.playerId,
        {
          playerId: snapshot.playerId,
          ...(snapshot.displayName ? { displayName: snapshot.displayName } : {}),
          ...(snapshot.representativePokemon
            ? { representativePokemon: snapshot.representativePokemon }
            : {}),
          updatedAtMs: 0,
        },
      ]),
  );
}

function getStateParticipants(server?: MockServerState) {
  const first = server?.joinedParticipants[0] ?? {
    sessionId: "server-session-1",
    playerId: "player-1",
    displayName: "Player 1",
    joinedAtMs: 0,
  };
  const second = server?.joinedParticipants[1] ?? {
    sessionId: "server-session-2",
    playerId: "player-2",
    displayName: "Player 2",
    joinedAtMs: 1,
  };

  return [first, second] as const;
}
