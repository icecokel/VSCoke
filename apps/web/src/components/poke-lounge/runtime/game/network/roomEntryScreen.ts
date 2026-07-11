import {
  createInviteUrl,
  normalizeRoomRoundDurationMs,
  createRoomCode as defaultCreateRoomCode,
  createServerInviteUrl,
  normalizeRoomCode,
  ROOM_ROUND_DURATION_OPTIONS_MS,
  ROOM_ROUND_DURATION_QUERY_PARAM,
  type RoomEntryMode,
  type RoomRoundDurationMs,
} from "./roomEntry";
import { playPokeLoungeSfx, primePokeLoungeAudio } from "../audio/poke-lounge-audio";

const DEFAULT_SELECTED_ROUND_DURATION_MS = 300_000;

export interface RoomEntrySelection {
  mode: Exclude<RoomEntryMode, "unset">;
  roomCode: string | null;
  inviteUrl: string | null;
  createRoom?: boolean;
  roundDurationMs?: RoomRoundDurationMs;
  resetSession?: boolean;
}

export interface RoomEntryScreenOptions {
  currentUrl: URL;
  createRoomCode?: () => string;
  onSelect(selection: RoomEntrySelection): void;
}

export function renderRoomEntryScreen(
  mount: HTMLElement,
  options: RoomEntryScreenOptions,
): HTMLElement {
  mount.innerHTML = "";

  const screen = document.createElement("section");
  screen.className = "room-entry-screen";
  screen.setAttribute("data-room-entry-screen", "true");

  const panel = document.createElement("div");
  panel.className = "room-entry-panel";

  const title = document.createElement("h1");
  title.textContent = "방 접속";

  const fanNotice = document.createElement("p");
  fanNotice.className = "room-entry-notice";
  fanNotice.setAttribute("data-poke-lounge-fan-notice", "true");
  fanNotice.textContent =
    "Poke Lounge는 친구들과 함께 즐기기 위해 만든 비공식 팬 게임입니다. Pokémon 관련 권리는 각 권리자에게 있습니다.";

  const soloButton = createButton("혼자 시작", "data-room-entry-solo");
  const newStartButton = createButton("새로 시작", "data-room-entry-new-start");
  const createButtonElement = createButton("로컬 방 만들기", "data-room-entry-create");
  const serverCreateButton = createButton("서버 방 만들기", "data-room-entry-server-create");
  let selectedRoundDurationMs = readInitialRoundDurationMs(options.currentUrl);
  const roundDurationPicker = createRoundDurationPicker(selectedRoundDurationMs, durationMs => {
    selectedRoundDurationMs = durationMs;
  });

  const roomCodeInput = document.createElement("input");
  roomCodeInput.type = "text";
  roomCodeInput.placeholder = "방 코드";
  roomCodeInput.setAttribute("data-room-entry-code", "true");

  const joinButton = createButton("코드로 입장", "data-room-entry-join");

  const serverRoomCodeInput = document.createElement("input");
  serverRoomCodeInput.type = "text";
  serverRoomCodeInput.placeholder = "서버 방 코드";
  serverRoomCodeInput.setAttribute("data-room-entry-server-code", "true");

  const serverJoinButton = createButton("서버 코드로 입장", "data-room-entry-server-join");

  const inviteInput = document.createElement("input");
  inviteInput.readOnly = true;
  inviteInput.setAttribute("data-room-entry-invite", "true");

  const message = document.createElement("p");
  message.className = "room-entry-message";
  message.setAttribute("data-room-entry-message", "true");

  const selectLocalRoom = (
    roomCode: string,
    resetSession = false,
    roundDurationMs?: RoomRoundDurationMs,
  ) => {
    playRoomEntryConfirmSound();
    const inviteUrl = createInviteUrl(options.currentUrl, roomCode, roundDurationMs).href;
    inviteInput.value = inviteUrl;
    message.textContent = "";
    options.onSelect({
      mode: "local-room",
      roomCode,
      inviteUrl,
      ...(roundDurationMs ? { roundDurationMs } : {}),
      ...(resetSession ? { resetSession: true } : {}),
    });
  };

  const selectServerRoom = (roomCode: string) => {
    playRoomEntryConfirmSound();
    const inviteUrl = createServerInviteUrl(options.currentUrl, roomCode).href;
    inviteInput.value = inviteUrl;
    message.textContent = "";
    options.onSelect({
      mode: "server-room",
      roomCode,
      inviteUrl,
    });
  };

  soloButton.addEventListener("click", () => {
    playRoomEntryConfirmSound();
    message.textContent = "";
    options.onSelect({
      mode: "solo",
      roomCode: null,
      inviteUrl: null,
    });
  });

  newStartButton.addEventListener("click", () => {
    playRoomEntryConfirmSound();
    message.textContent = "";
    options.onSelect({
      mode: "solo",
      roomCode: null,
      inviteUrl: null,
      resetSession: true,
    });
  });

  createButtonElement.addEventListener("click", () => {
    selectLocalRoom(
      (options.createRoomCode ?? defaultCreateRoomCode)(),
      true,
      selectedRoundDurationMs,
    );
  });

  serverCreateButton.addEventListener("click", () => {
    playRoomEntryConfirmSound();
    inviteInput.value = "";
    message.textContent = "";
    options.onSelect({
      mode: "server-room",
      roomCode: null,
      inviteUrl: null,
      createRoom: true,
      roundDurationMs: selectedRoundDurationMs,
      resetSession: true,
    });
  });

  joinButton.addEventListener("click", () => {
    const roomCode = normalizeRoomCode(roomCodeInput.value);

    if (!roomCode) {
      message.textContent = "방 코드를 입력해 주세요.";
      return;
    }

    selectLocalRoom(roomCode);
  });

  serverJoinButton.addEventListener("click", () => {
    const roomCode = normalizeRoomCode(serverRoomCodeInput.value);

    if (!roomCode) {
      message.textContent = "서버 방 코드를 입력해 주세요.";
      return;
    }

    selectServerRoom(roomCode);
  });

  panel.append(
    title,
    fanNotice,
    soloButton,
    newStartButton,
    roundDurationPicker,
    createButtonElement,
    roomCodeInput,
    joinButton,
    serverCreateButton,
    serverRoomCodeInput,
    serverJoinButton,
    inviteInput,
    message,
  );
  screen.appendChild(panel);
  mount.appendChild(screen);

  return screen;
}

function playRoomEntryConfirmSound(): void {
  void primePokeLoungeAudio();
  playPokeLoungeSfx("button-confirm");
}

function createButton(label: string, dataAttribute: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.setAttribute(dataAttribute, "true");

  return button;
}

function readInitialRoundDurationMs(url: URL): RoomRoundDurationMs {
  return (
    normalizeRoomRoundDurationMs(url.searchParams.get(ROOM_ROUND_DURATION_QUERY_PARAM)) ??
    DEFAULT_SELECTED_ROUND_DURATION_MS
  );
}

function createRoundDurationPicker(
  selectedDurationMs: RoomRoundDurationMs,
  onSelect: (durationMs: RoomRoundDurationMs) => void,
): HTMLElement {
  let activeDurationMs = selectedDurationMs;
  const field = document.createElement("div");
  field.className = "room-entry-round-duration";
  field.setAttribute("data-room-entry-round-duration", "true");

  const label = document.createElement("p");
  label.textContent = "토너먼트 시간";

  const options = document.createElement("div");
  options.className = "room-entry-round-duration-options";
  options.setAttribute("role", "group");
  options.setAttribute("aria-label", "토너먼트 시간");

  const buttons = ROOM_ROUND_DURATION_OPTIONS_MS.map(durationMs => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${durationMs / 60_000}분`;
    button.setAttribute("data-room-entry-round-duration-option", String(durationMs));

    button.addEventListener("click", () => {
      activeDurationMs = durationMs;
      onSelect(durationMs);
      syncButtons();
    });

    options.appendChild(button);
    return button;
  });

  const syncButtons = () => {
    for (const button of buttons) {
      const durationMs = normalizeRoomRoundDurationMs(
        button.getAttribute("data-room-entry-round-duration-option"),
      );
      const active = durationMs === activeDurationMs;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-active", active);
    }
  };

  syncButtons();
  field.append(label, options);

  return field;
}
