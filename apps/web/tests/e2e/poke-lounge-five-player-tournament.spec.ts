import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  chromium,
  devices,
  expect,
  firefox,
  type Browser,
  type BrowserContext,
  type Page,
  type Request,
  type Route,
  test,
  webkit,
} from "@playwright/test";

type Probe = {
  maxTouchPoints: number;
  coarsePointer: boolean;
  userAgent: string;
  platform: string;
};

type PublicRoom = {
  roomCode: string;
  revision: number;
  status: string;
  participants: Array<{
    playerId: string;
    displayName: string;
    role: string;
    ready: boolean;
    connected: boolean;
    joinedAtMs: number;
  }>;
  round: {
    index: number;
    phase: string;
    endsAtMs: number | null;
  };
  tournament: Record<string, unknown>;
  competitive?: {
    matchId: string;
    bracketMatchId: string;
    kind: "ranked-head-to-head" | "tournament-unranked";
    assignmentRevision: number;
    playerIds: [string, string];
    currentTurn: number;
    status: string;
    terminal: unknown;
    submittedPlayerIds: string[];
    currentState: {
      playersById: Record<
        string,
        {
          activeSlotIndex: number;
          team: Array<{
            currentHp: number;
            moves: Array<{ moveId: string; pp: number }>;
          }>;
        }
      >;
    };
  };
};

type TournamentBracket = {
  version: number;
  status: string;
  participants: Array<{ playerId: string; displayName: string; seed: number }>;
  currentRound: {
    roundNumber: number;
    matches: Array<{
      matchId: string;
      participantIds: [string, string];
      status: string;
      winnerPlayerId: string | null;
    }>;
    byes: Array<{
      byeId: string;
      entrant: { playerId: string; seed: number };
    }>;
  } | null;
  completedRounds: unknown[];
  championPlayerId: string | null;
};

type BattleSnapshot = {
  phase: string;
  turn: number;
  message: string | null;
  result: { winnerPlayerId: string; loserPlayerId: string; reason: string } | null;
  battleEntrancePlaying: boolean;
  selectedCommandIndex: number;
  selectedCommand: "fight" | "bag" | "pokemon" | "run";
  selectedMoveIndex: number;
  selectedPartySlotIndex: number;
  player: {
    currentHp: number;
    activePartySlotIndex: number;
  };
};

type TesterRuntimeState = {
  currentPlayerId: string;
  revision: number | null;
  round: number | null;
  activeMatchId: string | null;
  activeMatchTransport: string | null;
  canonicalBracket: TournamentBracket | null;
  activeScene: string | null;
  battle: BattleSnapshot | null;
  competitive: {
    matchId: string;
    bracketMatchId: string;
    assignmentRevision: number;
    currentTurn: number;
    status: string;
    terminal: unknown;
    submittedPlayerIds: string[];
  } | null;
  transportDiagnostics: TransportDiagnostics | null;
};

type TransportDiagnostics = {
  socketConnected: boolean;
  transportState: "not-created" | "connected" | "disconnected";
  recoveryAttempt: number;
  recoveryInFlight: boolean;
  recoveryTimerScheduled: boolean;
  subscriptionFailed: boolean;
  lastAppliedTerminalRevision: number | null;
  lastSocketErrorKind:
    | "connect_error"
    | "disconnect"
    | "subscription_error"
    | "invalid_snapshot"
    | null;
  lastSocketConnectErrorClass:
    | "websocket_error"
    | "timeout"
    | "server_reject"
    | "cors"
    | "unknown"
    | null;
  lastRecoveryFailureKind:
    | "canonical_mismatch"
    | "transition_merge"
    | "recovery_parse"
    | "unknown"
    | null;
};

type TerminalConvergencePhase =
  | "pre-terminal"
  | "old-match-terminal-observed"
  | "post-confirm"
  | "C4T";

type TransportEvidencePhase =
  | "initial"
  | "steady"
  | "full-reload"
  | "same-page-reconnect"
  | "C4T-reconnect";

type RecoveryCursor = {
  roomCode: string;
  afterRevision: number;
};

type SanitizedRecoveryStatus = {
  status: number;
  count: number;
};

type RecoveryRequestEvidence = RecoveryCursor & {
  phase: TransportEvidencePhase;
  requestCount: number;
  firstObservedAtMs: number;
  lastObservedAtMs: number;
  statuses: SanitizedRecoveryStatus[];
};

type FailureTimeTransportRecord = {
  phase: string;
  observedAtMs: number;
  transportDiagnostics: TransportDiagnostics | null;
  recoveryRequests: RecoveryRequestEvidence[];
  quiescenceBaseline: RecoveryQuiescenceBaseline | null;
};

type RecoveryQuiescenceBaseline = {
  observedAtMs: number;
  recoveryRequestTotal: number;
  transportDiagnostics: TransportDiagnostics;
};

type ReloadBaselineRecord = {
  phase: "FAULT_001_FULL_RELOAD";
  observedAtMs: number;
  freshRoomRevision: number;
  freshTerminalCursor: number;
  freshInitialRuntime: TesterRuntimeState;
  freshRecoveryCursor: RecoveryCursor;
  latestRoomRevision: number;
  latestTerminalCursor: number;
  latestRuntime: TesterRuntimeState;
};

type BattleLaunchEvidence = {
  matchId: string;
  bracketMatchId: string;
  assignmentRevision: number;
};

type ForcedSwitchEvidence = {
  tester: number;
  seed: number;
  matchId: string;
  playerId: string;
  turn: number;
  fromSlotIndex: number;
  toSlotIndex: number;
};

type DatabaseAssertions = {
  roomCode: string;
  seatCount: number;
  distinctAccountCount: number;
  gameHistoryCount: number;
  actionCount: number;
  actionKindCounts: { move: number; switch: number };
  forcedSwitchTurns: Array<{ matchId: string; playerId: string; turn: number }>;
  matches?: Array<{ status: string }>;
};

type TesterResult = {
  id: number;
  fileName: string;
  environment: string;
  viewport: string;
  input: "keyboard" | "touch";
  seed: number;
  role: string;
  status: "PASS" | "FAIL" | "BLOCKED";
  playerId: string | null;
  probe: Probe | null;
  recoveryRequests: RecoveryRequestEvidence[];
  failureTimeTransportRecords: FailureTimeTransportRecord[];
  reloadBaselineRecords: ReloadBaselineRecord[];
  battleLaunches: BattleLaunchEvidence[];
  terminalConvergence: Record<TerminalConvergencePhase, TesterRuntimeState | null>;
  checkpoints: Array<{
    checkpoint: string;
    revision: number | null;
    round: number | null;
    activeMatch: string | null;
    screenState: string;
    result: string;
    runtime: TesterRuntimeState;
  }>;
};

type TesterRuntime = TesterResult & {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  transportEvidencePhase: TransportEvidencePhase;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const RECOVERY_STABILITY_WINDOW_MS = 2_000;
const MAX_RECOVERY_REQUESTS_PER_RECONNECT = 4;
const SCREENSHOT_CAPTURE_DEADLINE_MS = 5_000;
const RUN_ROOT =
  process.env.POKE_LOUNGE_E2E_RUN_ROOT ??
  path.resolve(
    process.cwd(),
    "../../output/playwright/poke-lounge-five-player",
    `manual-${Date.now()}`,
  );

test("실제 API와 Socket.IO에서 5개 환경이 첫 토너먼트 라운드에 수렴한다", async ({}, testInfo) => {
  test.setTimeout(360_000);

  expect(API_URL, "통합 테스트에는 NEXT_PUBLIC_API_URL이 필요합니다.").not.toBe("");
  expect(process.env.POKE_LOUNGE_E2E, "전용 API bootstrap 경계를 사용해야 합니다.").toBe("1");
  expect(
    process.env.POKE_LOUNGE_E2E_ENV_ISOLATED,
    "runner가 DB secret을 제거한 Playwright 환경이어야 합니다.",
  ).toBe("1");
  expect(
    Object.keys(process.env).filter(isDatabaseEnvironmentName),
    "Playwright child는 DB 접속 환경을 받지 않아야 합니다.",
  ).toEqual([]);

  mkdirSync(path.join(RUN_ROOT, "screenshots"), { recursive: true });
  const networkErrors: Array<{
    tester: number;
    kind: "http-5xx" | "pageerror";
    detail: string;
  }> = [];
  const testers: TesterRuntime[] = [];
  const forcedSwitchEvidence: ForcedSwitchEvidence[] = [];
  let roomCode = "";
  let oldCompetitiveMatchId = "";
  let overallStatus: "PASS" | "FAIL" | "BLOCKED" = "FAIL";
  let failure: unknown;
  let dbAssertions: unknown = null;
  let initialBracket: TournamentBracket | null = null;
  let nextBracket: TournamentBracket | null = null;
  let convergedRoom: PublicRoom | null = null;

  try {
    const [chromiumBrowser, firefoxBrowser, webkitBrowser] = await Promise.all([
      chromium.launch(),
      firefox.launch(),
      webkit.launch(),
    ]);
    testers.push(
      await createTester({
        id: 1,
        browser: chromiumBrowser,
        environment: "Desktop Chromium",
        viewport: { width: 1440, height: 900 },
        input: "keyboard",
        seed: 1,
        role: "host, bye",
        fileName: "tester-01-chromium-desktop.md",
        networkErrors,
      }),
      await createTester({
        id: 2,
        browser: firefoxBrowser,
        environment: "Desktop Firefox",
        viewport: { width: 1366, height: 768 },
        input: "keyboard",
        seed: 2,
        role: "bye, reconnect",
        fileName: "tester-02-firefox-desktop.md",
        networkErrors,
      }),
      await createTester({
        id: 3,
        browser: webkitBrowser,
        environment: "Desktop WebKit",
        viewport: { width: 1440, height: 900 },
        input: "keyboard",
        seed: 3,
        role: "bye, socket observer",
        fileName: "tester-03-webkit-desktop.md",
        networkErrors,
      }),
      await createTester({
        id: 4,
        browser: chromiumBrowser,
        environment: "Mobile Chromium",
        viewport: { width: 390, height: 844 },
        input: "touch",
        mobileDevice: "Pixel 7",
        seed: 4,
        role: "first match player A",
        fileName: "tester-04-chromium-mobile.md",
        networkErrors,
      }),
      await createTester({
        id: 5,
        browser: webkitBrowser,
        environment: "Mobile WebKit",
        viewport: { width: 430, height: 932 },
        input: "touch",
        mobileDevice: "iPhone 13",
        seed: 5,
        role: "first match player B",
        fileName: "tester-05-webkit-mobile.md",
        networkErrors,
      }),
    );

    await test.step("C0_JOINED: 다섯 context를 고정 순서로 입장시킨다", async () => {
      const host = testers[0];
      await host.page.route("**/poke-lounge/rooms", routeFivePlayerRoomCreation);
      await openRoomEntry(host.page);
      await host.page.locator("[data-room-entry-server-create]").click();
      await chooseStarterIfNeeded(host.page);
      await expect(host.page.locator("#game-root canvas")).toBeVisible({ timeout: 30_000 });
      roomCode = await waitForRoomCode(host.page);
      await host.page.unroute("**/poke-lounge/rooms", routeFivePlayerRoomCreation);
      await waitForParticipantReady(roomCode, host);

      for (const tester of testers.slice(1)) {
        await openRoomEntry(tester.page);
        await tester.page.locator("[data-room-entry-server-code]").fill(roomCode);
        await tester.page.locator("[data-room-entry-server-join]").click();
        await chooseStarterIfNeeded(tester.page);
        await expect(tester.page.locator("#game-root canvas")).toBeVisible({ timeout: 30_000 });
        await expect.poll(() => readRoomCode(tester.page), { timeout: 30_000 }).toBe(roomCode);
        await waitForParticipantReady(roomCode, tester);
      }

      const joined = await pollRoom(roomCode, room => room.participants.length === 5);
      const participants = [...joined.participants].sort(
        (left, right) =>
          left.joinedAtMs - right.joinedAtMs || left.playerId.localeCompare(right.playerId),
      );
      expect(participants).toHaveLength(5);
      expect(new Set(participants.map(participant => participant.playerId)).size).toBe(5);
      expect(participants.every(participant => participant.role === "participant")).toBe(true);

      for (const [index, tester] of testers.entries()) {
        await expect
          .poll(() => Promise.resolve(tester.playerId), { timeout: 30_000 })
          .not.toBeNull();
        expect(tester.playerId).toBe(participants[index].playerId);
        await recordCheckpoint(tester, "C0_JOINED", "world", "PASS");
      }
    });

    await test.step("C1_STARTED: 첫 대진과 세 bye를 모든 context에서 확인한다", async () => {
      const readyRoom = await pollRoom(
        roomCode,
        room =>
          room.participants.length === 5 &&
          room.participants.every(participant => participant.ready),
      );
      expect(readyRoom.round.endsAtMs).not.toBeNull();
      const started = await pollRoom(roomCode, room => findBracket(room.tournament) !== null);
      initialBracket = findBracket(started.tournament);
      expect(initialBracket).not.toBeNull();

      const participantsBySeed = new Map(
        initialBracket!.participants.map(participant => [participant.seed, participant.playerId]),
      );
      expect(initialBracket!.currentRound?.matches).toHaveLength(1);
      expect(initialBracket!.currentRound?.matches[0]?.participantIds).toEqual([
        participantsBySeed.get(4),
        participantsBySeed.get(5),
      ]);
      expect(participantsBySeed.get(4)).toBe(testers[3].playerId);
      expect(participantsBySeed.get(5)).toBe(testers[4].playerId);
      expect(initialBracket!.currentRound?.byes.map(bye => bye.entrant.seed)).toEqual([1, 3, 2]);

      await expectBracketConvergence(testers, initialBracket!);
      await expect
        .poll(() => getActiveSceneKey(testers[3].page), { timeout: 30_000 })
        .toBe("battle");
      await expect
        .poll(() => getActiveSceneKey(testers[4].page), { timeout: 30_000 })
        .toBe("battle");
      for (const tester of testers.slice(0, 3)) {
        await expect.poll(() => getActiveSceneKey(tester.page), { timeout: 30_000 }).toBe("world");
      }
      for (const tester of testers.slice(3)) {
        await expect(tester.page.locator("[data-mobile-touch-controls='true']")).toBeVisible();
      }

      await Promise.all(testers.map(tester => waitForSocketConnected(tester)));

      for (const tester of testers) {
        await expect
          .poll(() => Promise.resolve(getRecoveryRequestTotal(tester)), { timeout: 30_000 })
          .toBeGreaterThan(0);
        const initialRecovery = await waitForRecoveryEvidence(tester, "initial", roomCode);
        expectSuccessfulRecoveryResponse(initialRecovery);
        tester.transportEvidencePhase = "steady";
      }

      await Promise.all(testers.map(tester => assertRecoveryStability(tester)));

      for (const tester of testers) {
        await recordCheckpoint(
          tester,
          "C1_STARTED",
          tester.seed >= 4 ? "battle" : "bye/wait",
          "PASS",
        );
      }
    });

    await test.step("FAULT-001: Firefox bye context를 retry 없이 reload한다", async () => {
      const firefoxTester = testers[1];
      const recoveryCount = getRecoveryRequestTotal(firefoxTester);
      firefoxTester.transportEvidencePhase = "full-reload";
      const response = await firefoxTester.page.reload({ waitUntil: "domcontentloaded" });
      expect(response?.status()).toBeLessThan(500);
      await chooseStarterIfNeeded(firefoxTester.page);
      await expect(firefoxTester.page.locator("#game-root canvas")).toBeVisible({
        timeout: 30_000,
      });
      await expect.poll(() => readRoomCode(firefoxTester.page), { timeout: 30_000 }).toBe(roomCode);
      await expect
        .poll(() => getActiveSceneKey(firefoxTester.page), { timeout: 30_000 })
        .toBe("world");
      await expect
        .poll(async () => (await readTesterRuntimeState(firefoxTester.page)).revision, {
          timeout: 30_000,
        })
        .not.toBeNull();
      await expect
        .poll(
          async () =>
            (await readTesterRuntimeState(firefoxTester.page)).transportDiagnostics
              ?.lastAppliedTerminalRevision ?? null,
          { timeout: 30_000 },
        )
        .not.toBeNull();
      const freshInitialObservedAtMs = Date.now();
      const freshInitialRuntime = await readTesterRuntimeState(firefoxTester.page);
      const freshRoomRevision = freshInitialRuntime.revision;
      const freshTerminalCursor =
        freshInitialRuntime.transportDiagnostics?.lastAppliedTerminalRevision ?? null;
      if (freshRoomRevision === null || freshTerminalCursor === null) {
        throw new Error("Firefox full reload did not expose hydrated room and terminal baselines.");
      }
      await expect
        .poll(() => Promise.resolve(getRecoveryRequestTotal(firefoxTester)), { timeout: 30_000 })
        .toBeGreaterThan(recoveryCount);
      const freshRecovery = await waitForRecoveryEvidence(firefoxTester, "full-reload", roomCode);
      expectSuccessfulRecoveryResponse(freshRecovery);
      const freshRuntime = await readTesterRuntimeState(firefoxTester.page);
      const latestRoomRevision = freshRuntime.revision;
      const latestTerminalCursor =
        freshRuntime.transportDiagnostics?.lastAppliedTerminalRevision ?? null;
      if (latestRoomRevision === null || latestTerminalCursor === null) {
        throw new Error("Firefox full reload lost hydrated room or terminal diagnostics.");
      }
      expect(freshRecovery.afterRevision).toBe(freshTerminalCursor);
      expect(latestRoomRevision).toBeGreaterThanOrEqual(freshRoomRevision);
      expect(latestTerminalCursor).toBeGreaterThanOrEqual(freshTerminalCursor);
      firefoxTester.reloadBaselineRecords.push({
        phase: "FAULT_001_FULL_RELOAD",
        observedAtMs: freshInitialObservedAtMs,
        freshRoomRevision,
        freshTerminalCursor,
        freshInitialRuntime,
        freshRecoveryCursor: {
          roomCode: freshRecovery.roomCode,
          afterRevision: freshRecovery.afterRevision,
        },
        latestRoomRevision,
        latestTerminalCursor,
        latestRuntime: freshRuntime,
      });
      firefoxTester.transportEvidencePhase = "steady";
      await recordCheckpoint(
        firefoxTester,
        "FAULT_001_FIREFOX_RELOAD",
        `world after cold reload room=${freshRoomRevision} terminal-cursor=${freshTerminalCursor}`,
        "PASS",
        freshRuntime,
      );
    });

    await test.step("FAULT-002: Firefox same-page Socket reconnect가 terminal cursor를 유지한다", async () => {
      const firefoxTester = testers[1];
      const { before, after } = await reconnectContextWithoutReload(firefoxTester);
      expect(after.afterRevision).toBe(before.afterRevision);
      const runtime = await readTesterRuntimeState(firefoxTester.page);
      expect(runtime.revision).not.toBeNull();
      expect(runtime.revision!).toBeGreaterThanOrEqual(after.afterRevision);
      await recordCheckpoint(
        firefoxTester,
        "FAULT_002_SOCKET_RECONNECT",
        `same-page reconnect afterRevision=${after.afterRevision}`,
        "PASS",
        runtime,
      );
    });

    await test.step("C2_ACTION_1/C3T_TERMINAL: 두 모바일 context가 confirm 전에 같은 old match 결과를 관측한다", async () => {
      const matchBefore = await fetchRoom(roomCode);
      expect(matchBefore.competitive).toBeDefined();
      oldCompetitiveMatchId = matchBefore.competitive!.matchId;
      expect([...(matchBefore.competitive?.playerIds ?? [])].sort()).toEqual(
        [...initialBracket!.currentRound!.matches[0]!.participantIds].sort(),
      );
      expect(matchBefore.competitive?.bracketMatchId).toBe(
        initialBracket!.currentRound!.matches[0]!.matchId,
      );
      expect(matchBefore.competitive?.kind).toBe("tournament-unranked");
      expect(matchBefore.tournament.activeMatchAuthority).toBe("server");
      await Promise.all(testers.map(tester => trackWorldBattleStarts(tester.page)));
      const preTerminalStates = await Promise.all(
        testers.map(tester => captureTerminalConvergence(tester, "pre-terminal")),
      );
      expect(preTerminalStates[3]).toMatchObject({
        activeScene: "battle",
        competitive: { matchId: oldCompetitiveMatchId, status: "pending" },
      });
      expect(preTerminalStates[4]).toMatchObject({
        activeScene: "battle",
        competitive: { matchId: oldCompetitiveMatchId, status: "pending" },
      });
      const actionEvidenceRoom = await finishBattleWithTouch(
        roomCode,
        [testers[3], testers[4]],
        networkErrors,
        forcedSwitchEvidence,
      );
      expect(
        (actionEvidenceRoom.competitive?.submittedPlayerIds.length ?? 0) > 0 ||
          (actionEvidenceRoom.competitive?.currentTurn ?? 0) >
            matchBefore.competitive!.currentTurn ||
          actionEvidenceRoom.competitive?.matchId !== matchBefore.competitive?.matchId ||
          (findBracket(actionEvidenceRoom.tournament)?.completedRounds.length ?? 0) >
            (findBracket(matchBefore.tournament)?.completedRounds.length ?? 0),
      ).toBe(true);
      expect(actionEvidenceRoom.competitive).toMatchObject({
        matchId: oldCompetitiveMatchId,
        status: "active",
      });
      expect(actionEvidenceRoom.competitive?.submittedPlayerIds).toContain(testers[3].playerId);
      for (const tester of testers) {
        await recordCheckpoint(
          tester,
          "C2_ACTION_1",
          tester.seed >= 4 ? "authoritative touch action" : "wait",
          "PASS",
        );
      }
      const terminalRoom = await pollRoom(
        roomCode,
        room =>
          Boolean(room.competitive?.terminal) ||
          Boolean(findBracket(room.tournament)?.completedRounds.length),
        90_000,
      );

      for (const tester of testers.slice(0, 3)) {
        await recordCheckpoint(tester, "C3T_TERMINAL_CONTEXT", "bye context", "PASS");
      }

      const [seed4Terminal, seed5Terminal] = await Promise.all([
        waitForOldMatchTerminalResult({
          tester: testers[3],
          oldMatchId: oldCompetitiveMatchId,
          terminalRevision: terminalRoom.revision,
          expectedResult: "loss",
        }),
        waitForOldMatchTerminalResult({
          tester: testers[4],
          oldMatchId: oldCompetitiveMatchId,
          terminalRevision: terminalRoom.revision,
          expectedResult: "win",
        }),
      ]);

      expect(seed4Terminal.competitive?.matchId).toBe(oldCompetitiveMatchId);
      expect(seed4Terminal.battle?.result).toMatchObject({
        loserPlayerId: testers[3].playerId,
        winnerPlayerId: testers[4].playerId,
      });
      expect(seed5Terminal.competitive?.matchId).toBe(oldCompetitiveMatchId);
      expect(seed5Terminal.battle?.result).toMatchObject({
        loserPlayerId: testers[3].playerId,
        winnerPlayerId: testers[4].playerId,
      });
      testers[3].terminalConvergence["old-match-terminal-observed"] = seed4Terminal;
      testers[4].terminalConvergence["old-match-terminal-observed"] = seed5Terminal;

      await recordCheckpoint(
        testers[3],
        "C3T_TERMINAL_OBSERVED",
        "old match loser result before confirm",
        "PASS",
        seed4Terminal,
      );
      await recordCheckpoint(
        testers[4],
        "C3T_TERMINAL_OBSERVED",
        "old match winner result before confirm",
        "PASS",
        seed5Terminal,
      );

      await Promise.all([
        tapMobileControl(testers[3].page, "confirm"),
        tapMobileControl(testers[4].page, "confirm"),
      ]);
      const postConfirmStates = await Promise.all(
        testers.map(tester =>
          tester.seed === 4 || tester.seed === 5
            ? waitForPostConfirmRuntime(tester, oldCompetitiveMatchId)
            : readTesterRuntimeState(tester.page),
        ),
      );
      for (const [index, tester] of testers.entries()) {
        const runtime = postConfirmStates[index];
        tester.terminalConvergence["post-confirm"] = runtime;
        await recordCheckpoint(
          tester,
          "C3T_POST_CONFIRM",
          tester.seed === 4
            ? "loser returned to world"
            : tester.seed === 5
              ? "winner left old battle"
              : "bye context after confirm",
          "PASS",
          runtime,
        );
      }
    });

    await test.step("C4T_NEXT_ROUND: 실제 scene/battle/competitive state가 역할별 다음 대진에 수렴한다", async () => {
      const nextRoom = await pollRoom(roomCode, room => {
        const bracket = findBracket(room.tournament);
        return Boolean(bracket?.currentRound && bracket.currentRound.roundNumber >= 2);
      });
      nextBracket = findBracket(nextRoom.tournament);
      convergedRoom = nextRoom;
      expect(nextBracket?.currentRound?.roundNumber).toBe(2);
      expect(nextRoom.competitive).toBeDefined();
      await expectBracketConvergence(testers, nextBracket!);

      for (const tester of testers) {
        await waitForC4RuntimeConvergence({
          tester,
          nextRoom,
          nextBracket: nextBracket!,
          oldMatchId: oldCompetitiveMatchId,
        });
      }

      const expectedNextLaunch = {
        matchId: nextRoom.competitive!.matchId,
        bracketMatchId: nextRoom.competitive!.bracketMatchId,
        assignmentRevision: nextRoom.competitive!.assignmentRevision,
      };
      for (const tester of testers) {
        expect(await getTrackedWorldBattleStarts(tester.page)).toEqual(
          tester.seed === 1 || tester.seed === 5 ? [expectedNextLaunch] : [],
        );
      }

      await Promise.all([
        reconnectContextWithoutReload(testers[0], "C4T-reconnect"),
        reconnectContextWithoutReload(testers[4], "C4T-reconnect"),
      ]);

      for (const tester of testers) {
        const runtime = await waitForC4RuntimeConvergence({
          tester,
          nextRoom,
          nextBracket: nextBracket!,
          oldMatchId: oldCompetitiveMatchId,
        });
        const nextBattleLaunches = await getTrackedWorldBattleStarts(tester.page);
        expect(nextBattleLaunches).toEqual(
          tester.seed === 1 || tester.seed === 5 ? [expectedNextLaunch] : [],
        );
        tester.battleLaunches = nextBattleLaunches;
        tester.terminalConvergence.C4T = runtime;
        await recordCheckpoint(
          tester,
          "C4T_NEXT_ROUND",
          tester.seed === 1 || tester.seed === 5
            ? "next authority battle"
            : "world while next match is active",
          "PASS",
          runtime,
        );
      }
    });

    await test.step("C5_CONVERGED: DB assertion과 네트워크 오류 부재를 확인한다", async () => {
      expect(convergedRoom).not.toBeNull();
      dbAssertions = await fetchJson<DatabaseAssertions>(
        `${API_URL}/__e2e/poke-lounge/assertions?roomCode=${encodeURIComponent(roomCode)}`,
      );
      expect(dbAssertions).toMatchObject({
        roomCode,
        seatCount: 5,
        distinctAccountCount: 5,
        gameHistoryCount: 0,
      });
      const assertionObject = dbAssertions as DatabaseAssertions;
      expect(assertionObject.actionKindCounts.move).toBeGreaterThan(0);
      expect(assertionObject.actionKindCounts.switch).toBeGreaterThan(0);
      expect(forcedSwitchEvidence.length).toBeGreaterThan(0);
      for (const evidence of forcedSwitchEvidence) {
        expect(assertionObject.forcedSwitchTurns).toContainEqual({
          matchId: evidence.matchId,
          playerId: evidence.playerId,
          turn: evidence.turn,
        });
      }
      expect(
        assertionObject.matches?.filter(
          match => match.status === "active" || match.status === "pending",
        ).length ?? 0,
      ).toBeLessThanOrEqual(1);

      for (const tester of testers) {
        await recordCheckpoint(tester, "C5_CONVERGED", "DB/REST/Socket", "PASS");
      }
      expect(networkErrors).toEqual([]);
    });

    for (const tester of testers) tester.status = "PASS";
    overallStatus = "PASS";
  } catch (error) {
    failure = error;
    overallStatus = isInfrastructureError(error) ? "BLOCKED" : "FAIL";
    for (const tester of testers) {
      if (tester.status !== "PASS") tester.status = overallStatus;
    }
    throw error;
  } finally {
    await captureScreenshots(testers);
    writeArtifacts({
      testers,
      roomCode,
      overallStatus,
      failure,
      networkErrors,
      dbAssertions,
      initialBracket,
      nextBracket,
      oldCompetitiveMatchId,
      forcedSwitchEvidence,
      projectName: testInfo.project.name,
    });
    await Promise.all(testers.map(tester => tester.context.close().catch(() => {})));
    await Promise.all([...new Set(testers.map(tester => tester.browser))].map(closeBrowser));
  }
});

async function createTester(input: {
  id: number;
  browser: Browser;
  environment: string;
  viewport: { width: number; height: number };
  input: "keyboard" | "touch";
  mobileDevice?: "Pixel 7" | "iPhone 13";
  seed: number;
  role: string;
  fileName: string;
  networkErrors: Array<{ tester: number; kind: "http-5xx" | "pageerror"; detail: string }>;
}): Promise<TesterRuntime> {
  const deviceDescriptor = input.mobileDevice ? devices[input.mobileDevice] : null;
  const deviceOptions = deviceDescriptor
    ? {
        userAgent: deviceDescriptor.userAgent,
        deviceScaleFactor: deviceDescriptor.deviceScaleFactor,
        isMobile: deviceDescriptor.isMobile,
        hasTouch: deviceDescriptor.hasTouch,
      }
    : {};
  const context = await input.browser.newContext({
    ...deviceOptions,
    viewport: input.viewport,
  });
  const token = `poke-lounge-e2e-token-${input.id}`;
  await context.route("**/api/auth/session", route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: `e2e-user-${input.id}`, name: `Tester ${input.id}` },
        expires: "2100-01-01T00:00:00.000Z",
        idToken: token,
        idTokenExpiresAt: 4_102_444_800,
      }),
    }),
  );
  const page = await context.newPage();
  const runtime: TesterRuntime = {
    id: input.id,
    fileName: input.fileName,
    environment: input.environment,
    viewport: `${input.viewport.width}x${input.viewport.height}`,
    input: input.input,
    seed: input.seed,
    role: input.role,
    status: "FAIL",
    playerId: null,
    probe: null,
    recoveryRequests: [],
    failureTimeTransportRecords: [],
    reloadBaselineRecords: [],
    battleLaunches: [],
    terminalConvergence: {
      "pre-terminal": null,
      "old-match-terminal-observed": null,
      "post-confirm": null,
      C4T: null,
    },
    checkpoints: [],
    browser: input.browser,
    context,
    page,
    transportEvidencePhase: "initial",
  };
  const recoveryEvidenceByRequest = new WeakMap<Request, RecoveryRequestEvidence>();

  page.on("request", request => {
    const recoveryCursor = parseRecoveryCursor(request.method(), request.url());
    if (recoveryCursor) {
      const evidence = recordRecoveryRequest(
        runtime,
        runtime.transportEvidencePhase,
        recoveryCursor,
        Date.now(),
      );
      recoveryEvidenceByRequest.set(request, evidence);
      return;
    }
    if (request.method() !== "POST") return;
    const pathname = new URL(request.url()).pathname;
    if (!/^\/poke-lounge\/rooms(?:\/[A-Z0-9]+\/join)?$/.test(pathname)) return;
    const body = request.postDataJSON() as { playerId?: unknown } | null;
    if (typeof body?.playerId === "string") runtime.playerId = body.playerId;
  });
  page.on("response", response => {
    const recoveryEvidence = recoveryEvidenceByRequest.get(response.request());
    if (recoveryEvidence) {
      recordSanitizedRecoveryStatus(recoveryEvidence, response.status());
    }
    if (response.status() < 500) return;
    input.networkErrors.push({
      tester: input.id,
      kind: "http-5xx",
      detail: `${response.status()} ${new URL(response.url()).pathname}`,
    });
  });
  page.on("pageerror", error => {
    input.networkErrors.push({
      tester: input.id,
      kind: "pageerror",
      detail: sanitizeError(error.message),
    });
  });
  runtime.probe = await page.evaluate(() => ({
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    userAgent: navigator.userAgent ?? "",
    platform: navigator.platform ?? "",
  }));
  return runtime;
}

async function openRoomEntry(page: Page): Promise<void> {
  const response = await page.goto("/ko-KR/game/poke-lounge?e2e=1", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBeLessThan(500);
  expect(response?.status()).toBeLessThan(400);
  await expect(page.locator("[data-room-entry-screen='true']")).toBeVisible({ timeout: 30_000 });
}

async function chooseStarterIfNeeded(page: Page): Promise<void> {
  const starter = page.locator("[data-screen='starter-selection']");
  const canvas = page.locator("#game-root canvas");
  await expect
    .poll(
      async () => {
        if (await starter.isVisible().catch(() => false)) return "starter";
        if (await canvas.isVisible().catch(() => false)) return "canvas";
        return null;
      },
      { timeout: 30_000 },
    )
    .not.toBeNull();
  if (await starter.isVisible().catch(() => false)) {
    await page.locator("[data-starter-confirm]").click();
  }
}

async function waitForRoomCode(page: Page): Promise<string> {
  await expect.poll(() => readRoomCode(page), { timeout: 30_000 }).toMatch(/^[A-Z0-9]{6}$/);
  return readRoomCode(page);
}

async function readRoomCode(page: Page): Promise<string> {
  return new URL(page.url()).searchParams.get("room") ?? "";
}

async function waitForParticipantReady(roomCode: string, tester: TesterRuntime): Promise<void> {
  await expect.poll(() => Promise.resolve(tester.playerId), { timeout: 30_000 }).not.toBeNull();
  await pollRoom(roomCode, room =>
    room.participants.some(
      participant => participant.playerId === tester.playerId && participant.ready,
    ),
  );
}

async function routeFivePlayerRoomCreation(route: Route): Promise<void> {
  const request = route.request();

  if (request.method() !== "POST") {
    await route.continue();
    return;
  }

  const headers = { ...request.headers() };
  delete headers["content-length"];
  await route.continue({
    headers,
    postData: JSON.stringify({
      ...(request.postDataJSON() as Record<string, unknown>),
      roundDurationMs: 30_000,
    }),
  });
}

async function fetchRoom(roomCode: string): Promise<PublicRoom> {
  return fetchJson(`${API_URL}/poke-lounge/rooms/${roomCode}`);
}

async function pollRoom(
  roomCode: string,
  predicate: (room: PublicRoom) => boolean,
  timeoutMs = 30_000,
): Promise<PublicRoom> {
  const startedAt = Date.now();
  let latest: PublicRoom | null = null;
  while (Date.now() - startedAt < timeoutMs) {
    latest = await fetchRoom(roomCode);
    if (predicate(latest)) return latest;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(
    `Timed out polling room ${roomCode}; last revision=${latest?.revision ?? "unavailable"}`,
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const body = (await response.json()) as { success?: boolean; data?: T; message?: unknown } | T;
  if (!response.ok) {
    throw new Error(`Request failed ${response.status} ${new URL(url).pathname}`);
  }
  if (body && typeof body === "object" && "data" in body) {
    return body.data as T;
  }
  return body as T;
}

function findBracket(value: unknown, depth = 0): TournamentBracket | null {
  if (!value || typeof value !== "object" || depth > 5) return null;
  const candidate = value as Partial<TournamentBracket>;
  if (
    typeof candidate.version === "number" &&
    Array.isArray(candidate.participants) &&
    "currentRound" in candidate &&
    Array.isArray(candidate.completedRounds)
  ) {
    return candidate as TournamentBracket;
  }
  for (const nested of Object.values(value)) {
    const result = findBracket(nested, depth + 1);
    if (result) return result;
  }
  return null;
}

async function expectBracketConvergence(
  testers: TesterRuntime[],
  expected: TournamentBracket,
): Promise<void> {
  const expectedCanonical = canonicalJson(canonicalizeBracketBySeed(expected));
  for (const tester of testers) {
    await expect
      .poll(
        () =>
          readBrowserBracket(tester.page).then(bracket =>
            bracket ? canonicalJson(canonicalizeBracketBySeed(bracket)) : null,
          ),
        { timeout: 30_000 },
      )
      .toBe(expectedCanonical);
  }
}

async function readBrowserBracket(page: Page): Promise<TournamentBracket | null> {
  return page.evaluate(() => {
    const state = (
      window as Window & {
        __POKE_LOUNGE_E2E__?: { getGameStateSnapshot(): unknown };
      }
    ).__POKE_LOUNGE_E2E__?.getGameStateSnapshot();
    const find = (value: unknown, depth = 0): unknown => {
      if (!value || typeof value !== "object" || depth > 5) return null;
      const candidate = value as Record<string, unknown>;
      if (
        typeof candidate.version === "number" &&
        Array.isArray(candidate.participants) &&
        "currentRound" in candidate &&
        Array.isArray(candidate.completedRounds)
      ) {
        return candidate;
      }
      for (const nested of Object.values(candidate)) {
        const result = find(nested, depth + 1);
        if (result) return result;
      }
      return null;
    };
    return find(state) as TournamentBracket | null;
  });
}

async function getActiveSceneKey(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (
        window as Window & { __POKE_LOUNGE_E2E__?: { getActiveSceneKey(): string | null } }
      ).__POKE_LOUNGE_E2E__?.getActiveSceneKey() ?? null,
  );
}

async function getBattleSnapshot(page: Page): Promise<BattleSnapshot | null> {
  return page.evaluate(
    () =>
      (
        window as Window & {
          __POKE_LOUNGE_E2E__?: { getBattleSnapshot(): BattleSnapshot | null };
        }
      ).__POKE_LOUNGE_E2E__?.getBattleSnapshot() ?? null,
  );
}

function parseRecoveryCursor(method: string, rawUrl: string): RecoveryCursor | null {
  if (method !== "GET") return null;
  const url = new URL(rawUrl);
  const apiUrl = new URL(API_URL);
  if (url.origin !== apiUrl.origin) return null;
  const roomCode = /^\/poke-lounge\/rooms\/([A-Z0-9]{1,6})\/?$/.exec(url.pathname)?.[1];
  const rawAfterRevision = url.searchParams.get("afterRevision");
  if (!roomCode || !rawAfterRevision || !/^\d+$/.test(rawAfterRevision)) return null;
  const afterRevision = Number(rawAfterRevision);
  return Number.isSafeInteger(afterRevision) ? { roomCode, afterRevision } : null;
}

function recordRecoveryRequest(
  tester: TesterRuntime,
  phase: TransportEvidencePhase,
  cursor: RecoveryCursor,
  observedAtMs: number,
): RecoveryRequestEvidence {
  const existing = tester.recoveryRequests.find(
    candidate =>
      candidate.phase === phase &&
      candidate.roomCode === cursor.roomCode &&
      candidate.afterRevision === cursor.afterRevision,
  );
  if (existing) {
    existing.requestCount += 1;
    existing.lastObservedAtMs = observedAtMs;
    return existing;
  }

  const evidence: RecoveryRequestEvidence = {
    phase,
    ...cursor,
    requestCount: 1,
    firstObservedAtMs: observedAtMs,
    lastObservedAtMs: observedAtMs,
    statuses: [],
  };
  tester.recoveryRequests.push(evidence);
  return evidence;
}

function recordSanitizedRecoveryStatus(evidence: RecoveryRequestEvidence, status: number): void {
  const existing = evidence.statuses.find(candidate => candidate.status === status);
  if (existing) {
    existing.count += 1;
    return;
  }
  evidence.statuses.push({ status, count: 1 });
}

function getRecoveryRequestTotal(tester: TesterRuntime): number {
  return tester.recoveryRequests.reduce((total, evidence) => total + evidence.requestCount, 0);
}

function getRecoveryRequestTotalForPhase(
  tester: TesterRuntime,
  phase: TransportEvidencePhase,
): number {
  return tester.recoveryRequests
    .filter(evidence => evidence.phase === phase)
    .reduce((total, evidence) => total + evidence.requestCount, 0);
}

function getRecoveryResponseTotal(evidence: RecoveryRequestEvidence): number {
  return evidence.statuses.reduce((total, status) => total + status.count, 0);
}

function findRecoveryEvidence(
  tester: TesterRuntime,
  phase: TransportEvidencePhase,
  roomCode: string,
  afterRevision?: number,
): RecoveryRequestEvidence | undefined {
  return tester.recoveryRequests.find(
    candidate =>
      candidate.phase === phase &&
      candidate.roomCode === roomCode &&
      (afterRevision === undefined || candidate.afterRevision === afterRevision),
  );
}

async function waitForRecoveryEvidence(
  tester: TesterRuntime,
  phase: TransportEvidencePhase,
  roomCode: string,
  afterRevision?: number,
): Promise<RecoveryRequestEvidence> {
  await expect
    .poll(
      () => {
        const evidence = findRecoveryEvidence(tester, phase, roomCode, afterRevision);
        return evidence ? getRecoveryResponseTotal(evidence) : 0;
      },
      { timeout: 30_000 },
    )
    .toBeGreaterThan(0);
  const evidence = findRecoveryEvidence(tester, phase, roomCode, afterRevision);
  if (!evidence) throw new Error(`Tester ${tester.id} did not expose recovery evidence`);
  return evidence;
}

function expectSuccessfulRecoveryResponse(evidence: RecoveryRequestEvidence): void {
  expect(getRecoveryResponseTotal(evidence)).toBeGreaterThan(0);
  expect(
    evidence.statuses.every(status => status.status >= 200 && status.status < 300),
    `Recovery request contained a non-success status: ${JSON.stringify(evidence.statuses)}`,
  ).toBe(true);
}

function snapshotRecoveryRequests(tester: TesterRuntime): RecoveryRequestEvidence[] {
  return tester.recoveryRequests.map(evidence => ({
    ...evidence,
    statuses: evidence.statuses.map(status => ({ ...status })),
  }));
}

async function appendFailureTimeTransportRecord(
  tester: TesterRuntime,
  phase: string,
  quiescenceBaseline: RecoveryQuiescenceBaseline | null = null,
): Promise<FailureTimeTransportRecord> {
  const runtime = await readTesterRuntimeState(tester.page);
  const record: FailureTimeTransportRecord = {
    phase,
    observedAtMs: Date.now(),
    transportDiagnostics: runtime.transportDiagnostics,
    recoveryRequests: snapshotRecoveryRequests(tester),
    quiescenceBaseline,
  };
  tester.failureTimeTransportRecords.push(record);
  return record;
}

async function waitForSocketConnected(tester: TesterRuntime): Promise<void> {
  try {
    await expect
      .poll(
        () =>
          readTesterRuntimeState(tester.page).then(
            runtime => runtime.transportDiagnostics?.socketConnected ?? false,
          ),
        { timeout: 30_000 },
      )
      .toBe(true);
  } catch {
    const record = await appendFailureTimeTransportRecord(tester, "C1_SOCKET_CONNECT");
    throw new Error(
      `Tester ${tester.id} did not reach socketConnected=true before C1 stability; diagnostics=${JSON.stringify(record)}`,
    );
  }
}

async function waitForHealthyRecoveryQuiescence(
  tester: TesterRuntime,
  phase: string,
): Promise<RecoveryQuiescenceBaseline> {
  try {
    await expect
      .poll(
        () =>
          readTesterRuntimeState(tester.page).then(runtime => {
            const diagnostics = runtime.transportDiagnostics;
            return (
              diagnostics?.socketConnected === true &&
              diagnostics.recoveryInFlight === false &&
              diagnostics.recoveryTimerScheduled === false &&
              diagnostics.subscriptionFailed === false &&
              diagnostics.recoveryAttempt === 0
            );
          }),
        { timeout: 30_000 },
      )
      .toBe(true);
  } catch {
    const record = await appendFailureTimeTransportRecord(tester, `${phase}_QUIESCENCE`);
    throw new Error(
      `Tester ${tester.id} did not reach healthy recovery quiescence; diagnostics=${JSON.stringify(record)}`,
    );
  }

  const runtime = await readTesterRuntimeState(tester.page);
  const transportDiagnostics = runtime.transportDiagnostics;
  if (
    transportDiagnostics === null ||
    !transportDiagnostics.socketConnected ||
    transportDiagnostics.recoveryInFlight ||
    transportDiagnostics.recoveryTimerScheduled ||
    transportDiagnostics.subscriptionFailed ||
    transportDiagnostics.recoveryAttempt !== 0
  ) {
    throw new Error(`Tester ${tester.id} changed recovery state while recording quiescence.`);
  }

  return {
    observedAtMs: Date.now(),
    recoveryRequestTotal: getRecoveryRequestTotal(tester),
    transportDiagnostics,
  };
}

async function assertRecoveryStability(
  tester: TesterRuntime,
  phase = "C1_STABILITY",
  quiescenceBaseline: RecoveryQuiescenceBaseline | null = null,
): Promise<void> {
  const totalBefore = quiescenceBaseline?.recoveryRequestTotal ?? getRecoveryRequestTotal(tester);
  await tester.page.waitForTimeout(RECOVERY_STABILITY_WINDOW_MS);
  const totalAfter = getRecoveryRequestTotal(tester);
  if (totalAfter !== totalBefore) {
    const record = await appendFailureTimeTransportRecord(tester, phase, quiescenceBaseline);
    expect(
      totalAfter,
      `Tester ${tester.id} emitted recovery GET during ${RECOVERY_STABILITY_WINDOW_MS}ms stability window; diagnostics=${JSON.stringify(record)}`,
    ).toBe(totalBefore);
    return;
  }
  expect(
    totalAfter,
    `Tester ${tester.id} emitted recovery GET during ${RECOVERY_STABILITY_WINDOW_MS}ms stability window`,
  ).toBe(totalBefore);
}

async function reconnectContextWithoutReload(tester: TesterRuntime): Promise<{
  before: RecoveryCursor;
  after: RecoveryCursor;
}>;
async function reconnectContextWithoutReload(
  tester: TesterRuntime,
  reconnectPhase: "C4T-reconnect",
): Promise<{
  before: RecoveryCursor;
  after: RecoveryCursor;
}>;
async function reconnectContextWithoutReload(
  tester: TesterRuntime,
  reconnectPhase: "same-page-reconnect" | "C4T-reconnect" = "same-page-reconnect",
): Promise<{
  before: RecoveryCursor;
  after: RecoveryCursor;
}> {
  const beforeRuntime = await readTesterRuntimeState(tester.page);
  if (beforeRuntime.revision === null) {
    throw new Error(`Tester ${tester.id} has no runtime revision before reconnect`);
  }
  const previousRecovery = tester.recoveryRequests.at(-1);
  if (!previousRecovery) {
    throw new Error(`Tester ${tester.id} has no recovery cursor before reconnect`);
  }
  const currentTerminalCursor = beforeRuntime.transportDiagnostics?.lastAppliedTerminalRevision;
  if (reconnectPhase === "C4T-reconnect" && currentTerminalCursor === null) {
    throw new Error(`Tester ${tester.id} has no terminal cursor before C4T reconnect`);
  }
  const before: RecoveryCursor = {
    roomCode: previousRecovery.roomCode,
    afterRevision:
      reconnectPhase === "C4T-reconnect" ? currentTerminalCursor! : previousRecovery.afterRevision,
  };
  expect(beforeRuntime.revision).toBeGreaterThanOrEqual(before.afterRevision);
  const recoveryCount = getRecoveryRequestTotalForPhase(tester, reconnectPhase);
  const pageUrl = tester.page.url();
  tester.transportEvidencePhase = reconnectPhase;

  await tester.context.setOffline(true);
  await tester.page.waitForTimeout(500);
  await tester.context.setOffline(false);
  await expect
    .poll(() => Promise.resolve(getRecoveryRequestTotalForPhase(tester, reconnectPhase)), {
      timeout: 30_000,
    })
    .toBeGreaterThan(recoveryCount);
  const afterEvidence = await waitForRecoveryEvidence(
    tester,
    reconnectPhase,
    before.roomCode,
    before.afterRevision,
  );
  const recoveryDelta = getRecoveryRequestTotalForPhase(tester, reconnectPhase) - recoveryCount;
  expect(recoveryDelta).toBeGreaterThanOrEqual(1);
  // A 500ms offline interval can include scheduler retries and a post-connect recovery.
  expect(recoveryDelta).toBeLessThanOrEqual(MAX_RECOVERY_REQUESTS_PER_RECONNECT);
  expect(afterEvidence.requestCount).toBeLessThanOrEqual(MAX_RECOVERY_REQUESTS_PER_RECONNECT);
  expectSuccessfulRecoveryResponse(afterEvidence);
  const after: RecoveryCursor = {
    roomCode: afterEvidence.roomCode,
    afterRevision: afterEvidence.afterRevision,
  };

  expect(tester.page.url()).toBe(pageUrl);
  expect(after.roomCode).toBe(before.roomCode);
  expect(after.afterRevision).toBe(before.afterRevision);
  await expect
    .poll(() => readTesterRuntimeState(tester.page).then(runtime => runtime.revision), {
      timeout: 30_000,
    })
    .toBeGreaterThanOrEqual(after.afterRevision);
  const quiescenceBaseline = await waitForHealthyRecoveryQuiescence(tester, reconnectPhase);
  tester.transportEvidencePhase = "steady";
  await assertRecoveryStability(
    tester,
    reconnectPhase === "same-page-reconnect"
      ? "FAULT_002_RECONNECT_STABILITY"
      : "C4T_RECONNECT_STABILITY",
    quiescenceBaseline,
  );
  return { before, after };
}

async function trackWorldBattleStarts(page: Page): Promise<void> {
  await page.evaluate(() => {
    type BattleLaunch = {
      matchId: string;
      bracketMatchId: string;
      assignmentRevision: number;
    };
    const pokeWindow = window as Window & {
      __POKE_LOUNGE_GAME__?: {
        scene?: {
          getScene?(key: string): {
            scene?: { start(key: string, data?: unknown): unknown };
          };
        };
      };
      __POKE_LOUNGE_WORLD_BATTLE_STARTS__?: BattleLaunch[];
      __POKE_LOUNGE_WORLD_BATTLE_START_TRACKED__?: boolean;
    };
    const scenePlugin = pokeWindow.__POKE_LOUNGE_GAME__?.scene?.getScene?.("world")?.scene;
    if (!scenePlugin) throw new Error("WorldScene is unavailable for battle launch tracking");

    pokeWindow.__POKE_LOUNGE_WORLD_BATTLE_STARTS__ = [];
    if (pokeWindow.__POKE_LOUNGE_WORLD_BATTLE_START_TRACKED__) return;
    pokeWindow.__POKE_LOUNGE_WORLD_BATTLE_START_TRACKED__ = true;
    const originalStart = scenePlugin.start.bind(scenePlugin);
    scenePlugin.start = (key: string, data?: unknown) => {
      const candidate = data as
        | {
            battleKind?: unknown;
            projection?: {
              matchId?: unknown;
              bracketMatchId?: unknown;
              assignmentRevision?: unknown;
            };
          }
        | undefined;
      if (
        key === "battle" &&
        candidate?.battleKind === "authoritative" &&
        typeof candidate.projection?.matchId === "string" &&
        typeof candidate.projection.bracketMatchId === "string" &&
        typeof candidate.projection.assignmentRevision === "number"
      ) {
        pokeWindow.__POKE_LOUNGE_WORLD_BATTLE_STARTS__?.push({
          matchId: candidate.projection.matchId,
          bracketMatchId: candidate.projection.bracketMatchId,
          assignmentRevision: candidate.projection.assignmentRevision,
        });
      }
      return originalStart(key, data as object | undefined);
    };
  });
}

async function getTrackedWorldBattleStarts(page: Page): Promise<BattleLaunchEvidence[]> {
  return page.evaluate(() => [
    ...((
      window as Window & {
        __POKE_LOUNGE_WORLD_BATTLE_STARTS__?: Array<{
          matchId: string;
          bracketMatchId: string;
          assignmentRevision: number;
        }>;
      }
    ).__POKE_LOUNGE_WORLD_BATTLE_STARTS__ ?? []),
  ]);
}

async function captureTerminalConvergence(
  tester: TesterRuntime,
  phase: TerminalConvergencePhase,
  runtimeState?: TesterRuntimeState,
): Promise<TesterRuntimeState> {
  const runtime = runtimeState ?? (await readTesterRuntimeState(tester.page));
  tester.terminalConvergence[phase] = runtime;
  return runtime;
}

async function readTesterRuntimeState(page: Page): Promise<TesterRuntimeState> {
  return page.evaluate(() => {
    type UnknownRecord = Record<string, unknown>;
    const isRecord = (value: unknown): value is UnknownRecord =>
      Boolean(value) && typeof value === "object" && !Array.isArray(value);
    const pokeWindow = window as Window & {
      __POKE_LOUNGE_GAME__?: {
        scene?: { getScene?(key: string): unknown };
      };
      __POKE_LOUNGE_E2E__?: {
        getActiveSceneKey(): string | null;
        getBattleSnapshot(): BattleSnapshot | null;
        getGameStateSnapshot(): unknown;
        getRoomTransportDiagnostics?(): unknown;
      };
    };
    const controller = pokeWindow.__POKE_LOUNGE_E2E__;
    let transportDiagnostics: TesterRuntimeState["transportDiagnostics"] = null;
    try {
      const candidate = controller?.getRoomTransportDiagnostics?.();
      const candidateRecord = isRecord(candidate) ? candidate : null;
      const validTransportState =
        candidateRecord !== null &&
        (candidateRecord.transportState === "not-created" ||
          candidateRecord.transportState === "connected" ||
          candidateRecord.transportState === "disconnected");
      const validErrorKind =
        candidateRecord !== null &&
        (candidateRecord.lastSocketErrorKind === null ||
          candidateRecord.lastSocketErrorKind === "connect_error" ||
          candidateRecord.lastSocketErrorKind === "disconnect" ||
          candidateRecord.lastSocketErrorKind === "subscription_error" ||
          candidateRecord.lastSocketErrorKind === "invalid_snapshot");
      const validErrorClass =
        candidateRecord !== null &&
        (candidateRecord.lastSocketConnectErrorClass === null ||
          candidateRecord.lastSocketConnectErrorClass === "websocket_error" ||
          candidateRecord.lastSocketConnectErrorClass === "timeout" ||
          candidateRecord.lastSocketConnectErrorClass === "server_reject" ||
          candidateRecord.lastSocketConnectErrorClass === "cors" ||
          candidateRecord.lastSocketConnectErrorClass === "unknown");
      const validRecoveryFailureKind =
        candidateRecord !== null &&
        (candidateRecord.lastRecoveryFailureKind === null ||
          candidateRecord.lastRecoveryFailureKind === "canonical_mismatch" ||
          candidateRecord.lastRecoveryFailureKind === "transition_merge" ||
          candidateRecord.lastRecoveryFailureKind === "recovery_parse" ||
          candidateRecord.lastRecoveryFailureKind === "unknown");
      const validTerminalCursor =
        candidateRecord !== null &&
        (candidateRecord.lastAppliedTerminalRevision === null ||
          (typeof candidateRecord.lastAppliedTerminalRevision === "number" &&
            Number.isSafeInteger(candidateRecord.lastAppliedTerminalRevision) &&
            candidateRecord.lastAppliedTerminalRevision >= 0));
      if (
        validTransportState &&
        validErrorKind &&
        validErrorClass &&
        validRecoveryFailureKind &&
        validTerminalCursor &&
        candidateRecord !== null &&
        typeof candidateRecord.socketConnected === "boolean" &&
        typeof candidateRecord.recoveryAttempt === "number" &&
        typeof candidateRecord.recoveryInFlight === "boolean" &&
        typeof candidateRecord.recoveryTimerScheduled === "boolean" &&
        typeof candidateRecord.subscriptionFailed === "boolean"
      ) {
        transportDiagnostics = {
          socketConnected: candidateRecord.socketConnected,
          transportState: candidateRecord.transportState,
          recoveryAttempt: candidateRecord.recoveryAttempt,
          recoveryInFlight: candidateRecord.recoveryInFlight,
          recoveryTimerScheduled: candidateRecord.recoveryTimerScheduled,
          subscriptionFailed: candidateRecord.subscriptionFailed,
          lastAppliedTerminalRevision: candidateRecord.lastAppliedTerminalRevision,
          lastSocketErrorKind: candidateRecord.lastSocketErrorKind,
          lastSocketConnectErrorClass: candidateRecord.lastSocketConnectErrorClass,
          lastRecoveryFailureKind: candidateRecord.lastRecoveryFailureKind,
        };
      }
    } catch {
      transportDiagnostics = null;
    }
    const state = controller?.getGameStateSnapshot();
    const stateRecord: UnknownRecord = isRecord(state) ? state : {};
    const tournamentState: UnknownRecord = isRecord(stateRecord.tournament)
      ? stateRecord.tournament
      : {};
    const serverProjection = isRecord(tournamentState.serverProjection)
      ? tournamentState.serverProjection
      : null;
    const serverTournament = isRecord(serverProjection?.tournament)
      ? serverProjection.tournament
      : null;
    const bracket = isRecord(serverTournament?.bracket) ? serverTournament.bracket : null;
    const currentRound = isRecord(bracket?.currentRound) ? bracket.currentRound : null;
    const activeScene = controller?.getActiveSceneKey() ?? null;
    const battle = controller?.getBattleSnapshot() ?? null;
    let competitive: TesterRuntimeState["competitive"] = null;

    if (activeScene === "battle") {
      const battleScene = pokeWindow.__POKE_LOUNGE_GAME__?.scene?.getScene?.("battle");
      const projection = isRecord(battleScene)
        ? (battleScene as UnknownRecord).authoritativeProjection
        : null;

      if (isRecord(projection)) {
        competitive = {
          matchId: typeof projection.matchId === "string" ? projection.matchId : "",
          bracketMatchId:
            typeof projection.bracketMatchId === "string" ? projection.bracketMatchId : "",
          assignmentRevision:
            typeof projection.assignmentRevision === "number" ? projection.assignmentRevision : -1,
          currentTurn: typeof projection.currentTurn === "number" ? projection.currentTurn : -1,
          status: typeof projection.status === "string" ? projection.status : "",
          terminal: projection.terminal ?? null,
          submittedPlayerIds: Array.isArray(projection.submittedPlayerIds)
            ? projection.submittedPlayerIds.filter(
                (playerId): playerId is string => typeof playerId === "string",
              )
            : [],
        };
      }
    }

    return {
      currentPlayerId:
        typeof stateRecord.currentPlayerId === "string" ? stateRecord.currentPlayerId : "",
      revision: typeof serverProjection?.revision === "number" ? serverProjection.revision : null,
      round: typeof currentRound?.roundNumber === "number" ? currentRound.roundNumber : null,
      activeMatchId:
        typeof serverTournament?.activeMatchId === "string" ? serverTournament.activeMatchId : null,
      activeMatchTransport:
        typeof serverProjection?.activeMatchTransport === "string"
          ? serverProjection.activeMatchTransport
          : null,
      canonicalBracket: bracket as TesterRuntimeState["canonicalBracket"],
      activeScene,
      battle,
      competitive,
      transportDiagnostics,
    };
  });
}

async function waitForOldMatchTerminalResult(input: {
  tester: TesterRuntime;
  oldMatchId: string;
  terminalRevision: number;
  expectedResult: "win" | "loss";
}): Promise<TesterRuntimeState> {
  const deadline = Date.now() + 15_000;
  let latest: TesterRuntimeState | null = null;
  const ownPlayerId = input.tester.playerId;

  if (!ownPlayerId) {
    throw new Error(`Tester ${input.tester.id} is missing its player ID`);
  }

  while (Date.now() < deadline) {
    latest = await readTesterRuntimeState(input.tester.page);
    const battleResult = latest.battle?.result;
    const terminal = readTerminalResult(latest.competitive?.terminal);
    const oldWaiting =
      latest.competitive?.matchId === input.oldMatchId &&
      !battleResult &&
      latest.battle?.message?.includes("상대의 선택을 기다리는 중") === true;

    if (latest.revision !== null && latest.revision >= input.terminalRevision && oldWaiting) {
      throw new Error(
        `C3T stale old-match waiting state: tester=${input.tester.id}, state=${JSON.stringify(latest)}`,
      );
    }

    const roleMatches =
      input.expectedResult === "win"
        ? battleResult?.winnerPlayerId === ownPlayerId && terminal?.winnerPlayerId === ownPlayerId
        : battleResult?.loserPlayerId === ownPlayerId && terminal?.loserPlayerId === ownPlayerId;

    if (
      latest.activeScene === "battle" &&
      latest.competitive?.matchId === input.oldMatchId &&
      latest.competitive.status === "completed" &&
      battleResult &&
      terminal &&
      roleMatches
    ) {
      return latest;
    }

    await input.tester.page.waitForTimeout(100);
  }

  throw new Error(
    `C3T terminal result was not observed before confirm: tester=${input.tester.id}, oldMatchId=${input.oldMatchId}, state=${JSON.stringify(latest)}`,
  );
}

async function waitForPostConfirmRuntime(
  tester: TesterRuntime,
  oldMatchId: string,
): Promise<TesterRuntimeState> {
  const deadline = Date.now() + 15_000;
  let latest: TesterRuntimeState | null = null;

  while (Date.now() < deadline) {
    latest = await readTesterRuntimeState(tester.page);
    const leftOldBattle =
      latest.activeScene === "world" ||
      (latest.activeScene === "battle" && latest.competitive?.matchId !== oldMatchId);
    const roleMatches = tester.seed === 4 ? latest.activeScene === "world" : leftOldBattle;

    if (leftOldBattle && roleMatches) {
      return latest;
    }

    await tester.page.waitForTimeout(100);
  }

  throw new Error(
    `Post-confirm runtime did not leave old battle: tester=${tester.id}, oldMatchId=${oldMatchId}, state=${JSON.stringify(latest)}`,
  );
}

async function waitForC4RuntimeConvergence(input: {
  tester: TesterRuntime;
  nextRoom: PublicRoom;
  nextBracket: TournamentBracket;
  oldMatchId: string;
}): Promise<TesterRuntimeState> {
  const deadline = Date.now() + 15_000;
  const expectedCompetitive = input.nextRoom.competitive;
  const expectedActiveMatchId =
    typeof input.nextRoom.tournament.activeMatchId === "string"
      ? input.nextRoom.tournament.activeMatchId
      : null;
  const expectedBracket = canonicalJson(canonicalizeBracketBySeed(input.nextBracket));
  const shouldBattle = input.tester.seed === 1 || input.tester.seed === 5;
  let latest: TesterRuntimeState | null = null;

  if (!expectedCompetitive || !expectedActiveMatchId) {
    throw new Error("C4T requires the next authoritative assignment");
  }

  while (Date.now() < deadline) {
    latest = await readTesterRuntimeState(input.tester.page);
    const oldWaiting =
      latest.competitive?.matchId === input.oldMatchId &&
      !latest.battle?.result &&
      latest.battle?.message?.includes("상대의 선택을 기다리는 중") === true;

    if (latest.revision !== null && latest.revision >= input.nextRoom.revision && oldWaiting) {
      throw new Error(
        `C4T stale old-match waiting state: tester=${input.tester.id}, state=${JSON.stringify(latest)}`,
      );
    }

    const commonStateMatches =
      latest.revision !== null &&
      latest.revision >= input.nextRoom.revision &&
      latest.round === input.nextBracket.currentRound?.roundNumber &&
      latest.activeMatchId === expectedActiveMatchId &&
      latest.activeMatchTransport === "authority" &&
      latest.canonicalBracket !== null &&
      canonicalJson(canonicalizeBracketBySeed(latest.canonicalBracket)) === expectedBracket;
    const roleStateMatches = shouldBattle
      ? latest.activeScene === "battle" &&
        latest.battle !== null &&
        latest.competitive?.matchId === expectedCompetitive.matchId &&
        latest.competitive.bracketMatchId === expectedCompetitive.bracketMatchId &&
        latest.competitive.currentTurn === expectedCompetitive.currentTurn &&
        latest.competitive.status === expectedCompetitive.status
      : latest.activeScene === "world" && latest.competitive === null;

    if (commonStateMatches && roleStateMatches) {
      return latest;
    }

    await input.tester.page.waitForTimeout(100);
  }

  throw new Error(
    `C4T runtime did not converge: tester=${input.tester.id}, expectedMatch=${expectedCompetitive.matchId}, state=${JSON.stringify(latest)}`,
  );
}

function readTerminalResult(
  value: unknown,
): { winnerPlayerId: string; loserPlayerId: string } | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;

  return typeof candidate.winnerPlayerId === "string" && typeof candidate.loserPlayerId === "string"
    ? {
        winnerPlayerId: candidate.winnerPlayerId,
        loserPlayerId: candidate.loserPlayerId,
      }
    : null;
}

async function finishBattleWithTouch(
  roomCode: string,
  players: [TesterRuntime, TesterRuntime],
  networkErrors: Array<{ tester: number; kind: "http-5xx" | "pageerror"; detail: string }>,
  forcedSwitchEvidence: ForcedSwitchEvidence[],
): Promise<PublicRoom> {
  const deadline = Date.now() + 120_000;
  let firstActionRoom: PublicRoom | null = null;
  let latestRoom: PublicRoom | null = null;
  let latestSnapshots: Array<BattleSnapshot | null> = [];
  const initialRoom = await fetchRoom(roomCode);
  const initialMatchId = initialRoom.competitive?.matchId ?? null;
  const initialCompletedRoundCount =
    findBracket(initialRoom.tournament)?.completedRounds.length ?? 0;

  while (Date.now() < deadline) {
    const runtimeError = networkErrors[0];
    if (runtimeError) {
      throw new Error(
        `Browser runtime error during authority battle: tester=${runtimeError.tester}, kind=${runtimeError.kind}, detail=${runtimeError.detail}`,
      );
    }
    latestRoom = await fetchRoom(roomCode);
    const projection = latestRoom.competitive;
    latestSnapshots = await Promise.all(players.map(player => getBattleSnapshot(player.page)));

    if (!firstActionRoom && projection && projection.submittedPlayerIds.length > 0) {
      expect(projection.status).toBe("active");
      expect(projection.submittedPlayerIds).toContain(players[0].playerId);
      expect(
        projection.submittedPlayerIds.every(playerId =>
          players.some(player => player.playerId === playerId),
        ),
      ).toBe(true);
      firstActionRoom = latestRoom;
    }
    const firstMatchAdvanced = Boolean(
      initialMatchId &&
      ((projection?.matchId && projection.matchId !== initialMatchId) ||
        (findBracket(latestRoom.tournament)?.completedRounds.length ?? 0) >
          initialCompletedRoundCount),
    );
    if (
      projection?.terminal ||
      firstMatchAdvanced ||
      latestSnapshots.every(snapshot => snapshot?.result)
    ) {
      return firstActionRoom ?? latestRoom;
    }

    const actionCandidates = firstActionRoom ? players : [players[0]];
    await Promise.all(
      actionCandidates.map(async tester => {
        const index = players.indexOf(tester);
        const playerId = tester.playerId;
        const snapshot = latestSnapshots[index];
        const authorityPlayer = playerId ? projection?.currentState.playersById[playerId] : null;
        if (!playerId || !snapshot || !projection || !authorityPlayer) return;
        if (projection.submittedPlayerIds.includes(playerId)) return;

        const active = authorityPlayer.team[authorityPlayer.activeSlotIndex];
        const nextAliveSlot = authorityPlayer.team.findIndex(
          (pokemon, slotIndex) =>
            slotIndex !== authorityPlayer.activeSlotIndex && pokemon.currentHp > 0,
        );
        const forcedSwitch = Boolean(active && active.currentHp <= 0 && nextAliveSlot >= 0);

        if (
          forcedSwitch &&
          !forcedSwitchEvidence.some(
            evidence =>
              evidence.matchId === projection.matchId &&
              evidence.playerId === playerId &&
              evidence.turn === projection.currentTurn,
          )
        ) {
          forcedSwitchEvidence.push({
            tester: tester.id,
            seed: tester.seed,
            matchId: projection.matchId,
            playerId,
            turn: projection.currentTurn,
            fromSlotIndex: authorityPlayer.activeSlotIndex,
            toSlotIndex: nextAliveSlot,
          });
        }

        await driveAuthoritativeTouchAction(tester.page, snapshot, {
          forcedSwitch,
          nextAliveSlot,
          yieldWithSwitch: tester.seed === 4 && nextAliveSlot >= 0,
        });
      }),
    );
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  throw new Error(
    `Mobile authority battle timed out: room=${roomCode}, turn=${latestRoom?.competitive?.currentTurn ?? "unknown"}, submitted=${latestRoom?.competitive?.submittedPlayerIds.join(",") ?? "unknown"}, snapshots=${JSON.stringify(latestSnapshots)}`,
  );
}

async function driveAuthoritativeTouchAction(
  page: Page,
  snapshot: BattleSnapshot,
  authority: { forcedSwitch: boolean; nextAliveSlot: number; yieldWithSwitch: boolean },
): Promise<void> {
  if (snapshot.battleEntrancePlaying || snapshot.phase === "resolving") return;
  if (snapshot.phase === "ended" || snapshot.result) return;
  if (snapshot.message) {
    await tapMobileControl(page, "confirm");
    return;
  }

  if (authority.forcedSwitch || authority.yieldWithSwitch) {
    if (snapshot.phase === "move-select") {
      await tapMobileControl(page, "back");
      return;
    }
    if (snapshot.phase === "command") {
      await moveCommandSelection(page, snapshot.selectedCommandIndex, 2);
      await tapMobileControl(page, "confirm");
      return;
    }
    if (snapshot.phase === "party-select") {
      await moveLinearSelection(page, snapshot.selectedPartySlotIndex, authority.nextAliveSlot);
      await tapMobileControl(page, "confirm");
    }
    return;
  }

  if (snapshot.phase === "party-select") {
    await tapMobileControl(page, "back");
    return;
  }
  if (snapshot.phase === "command") {
    await moveCommandSelection(page, snapshot.selectedCommandIndex, 0);
    await tapMobileControl(page, "confirm");
    return;
  }
  if (snapshot.phase === "move-select") {
    await tapMobileControl(page, "confirm");
  }
}

async function moveCommandSelection(page: Page, from: number, to: number): Promise<void> {
  let current = from;
  while (Math.floor(current / 2) > Math.floor(to / 2)) {
    await tapMobileControl(page, "up");
    current -= 2;
  }
  while (Math.floor(current / 2) < Math.floor(to / 2)) {
    await tapMobileControl(page, "down");
    current += 2;
  }
  if (current % 2 > to % 2) {
    await tapMobileControl(page, "left");
  } else if (current % 2 < to % 2) {
    await tapMobileControl(page, "right");
  }
}

async function moveLinearSelection(page: Page, from: number, to: number): Promise<void> {
  const direction = from < to ? "down" : "up";
  for (let index = 0; index < Math.abs(to - from); index += 1) {
    await tapMobileControl(page, direction);
  }
}

async function tapMobileControl(
  page: Page,
  control: "up" | "down" | "left" | "right" | "confirm" | "back",
): Promise<void> {
  const button = page.locator(`[data-mobile-control='${control}']`);
  await expect(button).toBeVisible();
  await button.tap();
  await page.waitForTimeout(75);
}

async function recordCheckpoint(
  tester: TesterRuntime,
  checkpoint: string,
  screenState: string,
  result: string,
  runtimeState?: TesterRuntimeState,
): Promise<void> {
  const runtime = runtimeState ?? (await readTesterRuntimeState(tester.page));
  tester.checkpoints.push({
    checkpoint,
    revision: runtime.revision,
    round: runtime.round,
    activeMatch: runtime.activeMatchId,
    screenState,
    result,
    runtime,
  });
}

async function captureScreenshots(testers: TesterRuntime[]): Promise<void> {
  await Promise.all(testers.map(captureScreenshot));
}

async function captureScreenshot(tester: TesterRuntime): Promise<void> {
  let deadlineTimer: ReturnType<typeof setTimeout> | null = null;
  const screenshot = tester.page
    .screenshot({
      path: path.join(RUN_ROOT, "screenshots", `${tester.fileName.replace(/\.md$/, "")}.png`),
      fullPage: true,
      timeout: SCREENSHOT_CAPTURE_DEADLINE_MS,
    })
    .then(() => undefined)
    .catch(() => undefined);
  const deadline = new Promise<void>(resolve => {
    deadlineTimer = setTimeout(resolve, SCREENSHOT_CAPTURE_DEADLINE_MS);
  });

  try {
    await Promise.race([screenshot, deadline]);
  } finally {
    if (deadlineTimer) clearTimeout(deadlineTimer);
  }
}

function writeArtifacts(input: {
  testers: TesterRuntime[];
  roomCode: string;
  overallStatus: "PASS" | "FAIL" | "BLOCKED";
  failure: unknown;
  networkErrors: Array<{ tester: number; kind: string; detail: string }>;
  dbAssertions: unknown;
  initialBracket: TournamentBracket | null;
  nextBracket: TournamentBracket | null;
  oldCompetitiveMatchId: string;
  forcedSwitchEvidence: ForcedSwitchEvidence[];
  projectName: string;
}): void {
  mkdirSync(RUN_ROOT, { recursive: true });
  const commit = readCommit();
  const endedAt = new Date().toISOString();
  const environment = {
    commit,
    node: process.version,
    playwrightProject: input.projectName,
    runId: path.basename(RUN_ROOT),
    endedAt,
    browsers: Object.fromEntries(
      input.testers.map(tester => [tester.environment, tester.browser.version()]),
    ),
    probes: Object.fromEntries(input.testers.map(tester => [tester.environment, tester.probe])),
  };
  const matrix = input.testers.map(tester => ({
    tester: tester.id,
    environment: tester.environment,
    viewport: tester.viewport,
    input: tester.input,
    seed: tester.seed,
    role: tester.role,
    status: tester.status,
  }));

  writeJson("environment.json", environment);
  writeJson("matrix.json", matrix);
  writeJson("network-errors.json", input.networkErrors);
  writeJson("db-assertions.json", input.dbAssertions ?? { status: "not-collected" });
  const databaseActionEvidence = input.dbAssertions as Partial<DatabaseAssertions> | null;
  writeJson("forced-switch-evidence.json", {
    client: input.forcedSwitchEvidence,
    database: {
      actionKindCounts: databaseActionEvidence?.actionKindCounts ?? null,
      forcedSwitchTurns: databaseActionEvidence?.forcedSwitchTurns ?? [],
    },
  });
  writeJson("client-terminal-convergence.json", {
    oldMatchId: input.oldCompetitiveMatchId || null,
    overallStatus: input.overallStatus,
    testers: input.testers.map(tester => ({
      tester: tester.id,
      seed: tester.seed,
      playerId: tester.playerId,
      snapshots: tester.terminalConvergence,
      transportDiagnostics: tester.checkpoints.at(-1)?.runtime.transportDiagnostics ?? null,
      failureTimeTransportRecords: tester.failureTimeTransportRecords,
      reloadBaselineRecords: tester.reloadBaselineRecords,
      nextBattleLaunches: tester.battleLaunches,
    })),
  });
  writeJson("socket-revisions.json", {
    evidenceModel: {
      transport:
        "websocket-only-config: serverRoom socketFactory의 transports:['websocket'] 정적 설정; test-only controller getter가 sanitized transport diagnostics만 제공",
      recovery:
        "raw URL/body/header/response body 없이 roomCode, afterRevision, phase, request count, observed time, status만 집계",
      cursor:
        "같은 handleSocketConnect가 room.subscribe 직후 동일 lastAppliedTerminalRevision으로 recovery GET을 호출하는 코드 계약과 same-page reconnect의 live GET 증가/runtime 수렴을 결합",
      limitation: "Socket.IO subscribe 원문 frame은 수집하거나 저장하지 않음",
    },
    initialBracket: input.initialBracket,
    nextBracket: input.nextBracket,
    checkpoints: input.testers.map(tester => ({
      tester: tester.id,
      recoveryRequests: tester.recoveryRequests,
      failureTimeTransportRecords: tester.failureTimeTransportRecords,
      reloadBaselineRecords: tester.reloadBaselineRecords,
      checkpoints: tester.checkpoints,
    })),
  });

  for (const tester of input.testers) {
    writeFileSync(
      path.join(RUN_ROOT, tester.fileName),
      renderTesterReport(tester, input.roomCode, commit, endedAt),
    );
  }
  writeFileSync(
    path.join(RUN_ROOT, "validation-summary.md"),
    renderSummary(input, commit, endedAt),
  );
}

function renderTesterReport(
  tester: TesterResult,
  roomCode: string,
  commit: string,
  endedAt: string,
): string {
  const checkpointRows = tester.checkpoints.length
    ? tester.checkpoints
        .map(
          checkpoint =>
            `| ${checkpoint.checkpoint} | ${checkpoint.revision ?? "-"} | ${checkpoint.round ?? "-"} | ${checkpoint.activeMatch ?? "-"} | ${checkpoint.screenState} | ${checkpoint.result} |`,
        )
        .join("\n")
    : "| 미수집 | - | - | - | 실행 중단 | BLOCKED |";
  return `# Tester ${String(tester.id).padStart(2, "0")} 검증 결과

- 환경: ${tester.environment}
- viewport/input: ${tester.viewport} / ${tester.input}
- seed/역할: ${tester.seed} / ${tester.role}
- build commit: ${commit}
- room code: ${roomCode || "미생성"}
- 종료 시각: ${endedAt}
- 결과: ${tester.status}

## Checkpoint

| checkpoint | revision | round | active match | 화면 상태 | 판정 |
| --- | ---: | ---: | --- | --- | --- |
${checkpointRows}

## 환경 probe

\`\`\`json
${JSON.stringify(tester.probe, null, 2)}
\`\`\`

## Recovery request 증거

\`\`\`json
${JSON.stringify(
  {
    recoveryRequests: tester.recoveryRequests,
    failureTimeTransportRecords: tester.failureTimeTransportRecords,
    reloadBaselineRecords: tester.reloadBaselineRecords,
  },
  null,
  2,
)}
\`\`\`

## 게임성 평가

자동화는 기능 흐름만 판정하며 주관 점수는 수동 테스터가 입력한다.

| 항목 | 점수(1~5) | 근거 |
| --- | ---: | --- |
| 대진과 역할 명확성 | 미평가 | 수동 검증 필요 |
| bye/대기 명확성 | 미평가 | 수동 검증 필요 |
| 입력 반응성 | 미평가 | 자동 입력 결과는 checkpoint 참고 |
| turn/결과 피드백 | 미평가 | 수동 검증 필요 |
| 전체 재미/답답함 | 미평가 | 수동 검증 필요 |

## 최종 의견

- 다음 행동을 설명 없이 알 수 있었는가: 수동 검증 필요
- 다시 테스트가 필요한가: ${tester.status === "PASS" ? "게임성 수동 평가" : "예"}
`;
}

function renderSummary(
  input: Parameters<typeof writeArtifacts>[0],
  commit: string,
  endedAt: string,
): string {
  const error = input.failure ? sanitizeError(String(input.failure)) : "없음";
  const allPassedCheckpoint = (checkpoint: string) =>
    input.testers.length === 5 &&
    input.testers.every(tester =>
      tester.checkpoints.some(
        candidate => candidate.checkpoint === checkpoint && candidate.result === "PASS",
      ),
    );
  const firefoxReloadPassed = Boolean(
    input.testers[1]?.checkpoints.some(
      checkpoint => checkpoint.checkpoint === "FAULT_001_FIREFOX_RELOAD",
    ),
  );
  const samePageReconnectPassed = Boolean(
    input.testers[1]?.checkpoints.some(
      checkpoint => checkpoint.checkpoint === "FAULT_002_SOCKET_RECONNECT",
    ),
  );
  const c3tStates = [input.testers[3], input.testers[4]].map(tester =>
    tester?.checkpoints.find(
      checkpoint =>
        checkpoint.checkpoint === "C3T_TERMINAL_OBSERVED" && checkpoint.result === "PASS",
    ),
  );
  const c3tTerminalObserved =
    c3tStates.every(
      checkpoint =>
        typeof checkpoint?.runtime.competitive?.matchId === "string" &&
        Boolean(checkpoint.runtime.battle?.result),
    ) && c3tStates[0]?.runtime.competitive?.matchId === c3tStates[1]?.runtime.competitive?.matchId;
  const gateStatus = (passed: boolean, attempted: boolean) =>
    passed ? "PASS" : attempted ? "FAIL" : "BLOCKED";
  return `# Poke Lounge 5인 토너먼트 검증 요약

- 결과: ${input.overallStatus}
- build commit: ${commit}
- room code: ${input.roomCode || "미생성"}
- 종료 시각: ${endedAt}
- Playwright workers/retries: 1 / 0
- 실행 환경: Desktop Chromium, Desktop Firefox, Desktop WebKit, Mobile Chromium, Mobile WebKit

## Gate 결과

| Gate | 판정 |
| --- | --- |
| C0 5개 identity 및 participant 분리 | ${gateStatus(allPassedCheckpoint("C0_JOINED"), input.testers.length === 5)} |
| C1 첫 대진 seed 4 vs 5, bye 1/3/2 | ${gateStatus(allPassedCheckpoint("C1_STARTED"), Boolean(input.initialBracket))} |
| C2 모바일 touch authority action | ${gateStatus(
    allPassedCheckpoint("C2_ACTION_1"),
    input.testers.some(tester =>
      tester.checkpoints.some(checkpoint => checkpoint.checkpoint === "C2_ACTION_1"),
    ),
  )} |
| C3T seed 4/5 동일 old match terminal/result 선관측 | ${gateStatus(c3tTerminalObserved, Boolean(input.nextBracket))} |
| C4T 실제 store/scene/battle/competitive 다음 대진 수렴 | ${gateStatus(allPassedCheckpoint("C4T_NEXT_ROUND"), Boolean(input.nextBracket))} |
| C5 DB/REST/Socket/client 최종 수렴 | ${gateStatus(allPassedCheckpoint("C5_CONVERGED"), Boolean(input.dbAssertions))} |
| Firefox reload 최초 500 없음 | ${gateStatus(firefoxReloadPassed && !input.networkErrors.some(error => error.tester === 2 && error.kind === "http-5xx"), firefoxReloadPassed || input.testers.some(tester => tester.checkpoints.some(checkpoint => checkpoint.checkpoint === "C2_ACTION_1")))} |
| Firefox same-page Socket reconnect cursor 유지 | ${gateStatus(samePageReconnectPassed, firefoxReloadPassed)} |

Socket reconnect 판정은 원문 subscribe frame이나 live WebSocket handshake를 저장하지 않는다. WebSocket-only transport는 \`serverRoom\`의 정적 \`transports:['websocket']\` 설정으로만 확인하고, 같은 \`handleSocketConnect\` 호출이 subscribe 직후 동일 \`lastAppliedTerminalRevision\`으로 수행하는 live recovery GET의 증가 및 runtime revision 수렴을 간접 증거로 사용한다.

## 오류 또는 차단 사유

${error}

## 주의

Playwright 모바일은 emulation 결과이며 실제 iOS Safari 판정을 대체하지 않는다. 주관적 게임성 점수는 별도 수동 평가가 필요하다.
`;
}

function writeJson(fileName: string, value: unknown): void {
  writeFileSync(path.join(RUN_ROOT, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortRecord(value));
}

function canonicalizeBracketBySeed(bracket: TournamentBracket): unknown {
  const seedByPlayerId = new Map(
    bracket.participants.map(participant => [participant.playerId, participant.seed]),
  );
  const canonicalRound = (round: TournamentBracket["currentRound"]) =>
    round
      ? {
          roundNumber: round.roundNumber,
          matches: round.matches.map(match => ({
            matchId: match.matchId,
            participantSeeds: match.participantIds.map(playerId => seedByPlayerId.get(playerId)),
            status: match.status,
            winnerSeed: match.winnerPlayerId
              ? (seedByPlayerId.get(match.winnerPlayerId) ?? null)
              : null,
          })),
          byes: round.byes.map(bye => ({
            byeId: bye.byeId,
            seed: bye.entrant.seed,
          })),
        }
      : null;

  return {
    version: bracket.version,
    status: bracket.status,
    participantSeeds: bracket.participants.map(participant => participant.seed),
    currentRound: canonicalRound(bracket.currentRound),
    completedRounds: (
      bracket.completedRounds as Array<NonNullable<TournamentBracket["currentRound"]>>
    ).map(canonicalRound),
    championSeed: bracket.championPlayerId
      ? (seedByPlayerId.get(bracket.championPlayerId) ?? null)
      : null,
  };
}

function sortRecord(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortRecord);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortRecord(nested)]),
  );
}

function readCommit(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: path.resolve(process.cwd(), "../.."),
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

function isInfrastructureError(error: unknown): boolean {
  return /executable doesn't exist|ECONNREFUSED|TEST_DATABASE_URL|browser.*not found/i.test(
    String(error),
  );
}

function isDatabaseEnvironmentName(name: string): boolean {
  return (
    name === "TEST_DATABASE_URL" ||
    name === "DATABASE_URL" ||
    name === "DB_URL" ||
    name === "PGDATABASE" ||
    name === "PGHOST" ||
    name === "PGPASSWORD" ||
    name === "PGPORT" ||
    name === "PGUSER" ||
    name.startsWith("DB_")
  );
}

function sanitizeError(value: string): string {
  return value
    .replace(new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, "g"), "")
    .replace(/poke-lounge-e2e-token-[1-5]/g, "[redacted-token]")
    .replace(/server-session-[a-z0-9-]+/gi, "[redacted-session]")
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted-database-url]")
    .slice(0, 2_000);
}

async function closeBrowser(browser: Browser): Promise<void> {
  await browser.close().catch(() => {});
}
