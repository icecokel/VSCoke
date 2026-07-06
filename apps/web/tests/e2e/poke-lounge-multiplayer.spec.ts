import { expect, type Browser, type Page, type Request, test } from "@playwright/test";
import { gotoWithRetry } from "./test-helpers";

type PokeLoungeWindow = Window & {
  __POKE_LOUNGE_E2E__?: {
    getRoomSnapshot(): {
      roomId: string | null;
      sessionId: string | null;
    };
  };
};

const LOCALE = "ko-KR";
const ROOM_CODE = "SRV001";

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

    expect(server.calls).toContain(`POST /poke-lounge/rooms/${ROOM_CODE}/join`);
    expect(server.calls).toContain(`POST /poke-lounge/rooms/${ROOM_CODE}/ready`);
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

  test("server room result submit이 거부되면 클라이언트는 토너먼트 결과를 임의 성공 처리하지 않는다", async ({
    page,
  }) => {
    const server = createMockServerState();

    await mockServerRoom(page, server, { rejectResult: true });
    await startServerRoom(page);

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
    expect(server.calls).toContain(`POST /poke-lounge/rooms/${ROOM_CODE}/result`);
  });

  test("server room create 후 두 브라우저 컨텍스트가 서로 다른 identity로 같은 방에 참가한다", async ({
    browser,
  }) => {
    const server = createMockServerState();
    const hostPage = await newMockedPage(browser, server, { wrapped: true });
    const guestPage = await newMockedPage(browser, server, { wrapped: true });

    await startServerRoom(hostPage, `/${LOCALE}/game/poke-lounge?network=server&create=1&e2e=1`);
    await expect
      .poll(() => getRoomSnapshot(hostPage).then(snapshot => snapshot?.roomId ?? null), {
        timeout: 30000,
      })
      .toBe(ROOM_CODE);

    await startServerRoom(guestPage);

    await expect.poll(() => Promise.resolve(server.joinedPlayerIds.size)).toBe(2);
    await expect.poll(() => Promise.resolve(server.joinedSessionIds.size)).toBe(2);

    await hostPage.context().close();
    await guestPage.context().close();
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
  const starterVisible = await starterSelection
    .waitFor({ state: "visible", timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (starterVisible) {
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

async function mockServerRoom(
  page: Page,
  server: MockServerState,
  options: { completeOnGet?: boolean; rejectResult?: boolean; wrapped?: boolean } = {},
): Promise<void> {
  await page.route("**/poke-lounge/rooms**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const suffix = url.pathname.replace(`/poke-lounge/rooms/${ROOM_CODE}`, "");

    server.calls.push(`${method} ${url.pathname}`);

    if (method === "POST" && url.pathname === "/poke-lounge/rooms") {
      await recordJoinedIdentity(request, server);
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

    if (method === "POST" && suffix === "/result") {
      await route.fulfill({
        status: options.rejectResult ? 400 : 201,
        contentType: "application/json",
        body: stringifyResponse(
          options.rejectResult
            ? { message: "Invalid match result" }
            : createCompletedRoomState(server),
          options,
        ),
      });
      return;
    }

    await route.fulfill({
      status: method === "GET" ? 200 : 201,
      contentType: "application/json",
      body: stringifyResponse(
        options.rejectResult || (options.completeOnGet && method !== "GET")
          ? createTournamentRoomState(server)
          : createCompletedRoomState(server),
        options,
      ),
    });
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
  calls: string[];
  joinedPlayerIds: Set<string>;
  joinedSessionIds: Set<string>;
  joinedParticipants: Array<{
    playerId: string;
    sessionId: string;
    displayName?: string;
  }>;
}

function createMockServerState(): MockServerState {
  return {
    calls: [],
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
    });
  }
}

function stringifyResponse(value: unknown, options: { wrapped?: boolean }): string {
  return JSON.stringify(options.wrapped ? { success: true, data: value } : value);
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
  };
}

function createCompletedRoomState(server?: MockServerState) {
  const [first, second] = getStateParticipants(server);

  return {
    roomCode: ROOM_CODE,
    status: "completed",
    participants: [
      {
        sessionId: first.sessionId,
        playerId: first.playerId,
        displayName: first.displayName ?? "Player 1",
        role: "participant",
        ready: true,
        connected: true,
      },
      {
        sessionId: second.sessionId,
        playerId: second.playerId,
        displayName: second.displayName ?? "Player 2",
        role: "participant",
        ready: true,
        connected: true,
      },
    ],
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

function getStateParticipants(server?: MockServerState) {
  const first = server?.joinedParticipants[0] ?? {
    sessionId: "server-session-1",
    playerId: "player-1",
    displayName: "Player 1",
  };
  const second = server?.joinedParticipants[1] ?? {
    sessionId: "server-session-2",
    playerId: "player-2",
    displayName: "Player 2",
  };

  return [first, second] as const;
}
