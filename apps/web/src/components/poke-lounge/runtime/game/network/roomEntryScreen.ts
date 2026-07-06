import {
  createInviteUrl,
  createRoomCode as defaultCreateRoomCode,
  normalizeRoomCode,
  type RoomEntryMode,
} from "./roomEntry";

export interface RoomEntrySelection {
  mode: Exclude<RoomEntryMode, "unset">;
  roomCode: string | null;
  inviteUrl: string | null;
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

  const soloButton = createButton("혼자 시작", "data-room-entry-solo");
  const newStartButton = createButton("새로 시작", "data-room-entry-new-start");
  const createButtonElement = createButton("방 만들기", "data-room-entry-create");

  const roomCodeInput = document.createElement("input");
  roomCodeInput.placeholder = "방 코드";
  roomCodeInput.setAttribute("data-room-entry-code", "true");

  const joinButton = createButton("코드로 입장", "data-room-entry-join");

  const inviteInput = document.createElement("input");
  inviteInput.readOnly = true;
  inviteInput.setAttribute("data-room-entry-invite", "true");

  const message = document.createElement("p");
  message.className = "room-entry-message";
  message.setAttribute("data-room-entry-message", "true");

  const selectLocalRoom = (roomCode: string, resetSession = false) => {
    const inviteUrl = createInviteUrl(options.currentUrl, roomCode).href;
    inviteInput.value = inviteUrl;
    message.textContent = "";
    options.onSelect({
      mode: "local-room",
      roomCode,
      inviteUrl,
      ...(resetSession ? { resetSession: true } : {}),
    });
  };

  soloButton.addEventListener("click", () => {
    message.textContent = "";
    options.onSelect({
      mode: "solo",
      roomCode: null,
      inviteUrl: null,
    });
  });

  newStartButton.addEventListener("click", () => {
    message.textContent = "";
    options.onSelect({
      mode: "solo",
      roomCode: null,
      inviteUrl: null,
      resetSession: true,
    });
  });

  createButtonElement.addEventListener("click", () => {
    selectLocalRoom((options.createRoomCode ?? defaultCreateRoomCode)(), true);
  });

  joinButton.addEventListener("click", () => {
    const roomCode = normalizeRoomCode(roomCodeInput.value);

    if (!roomCode) {
      message.textContent = "방 코드를 입력해 주세요.";
      return;
    }

    selectLocalRoom(roomCode);
  });

  panel.append(
    title,
    soloButton,
    newStartButton,
    createButtonElement,
    roomCodeInput,
    joinButton,
    inviteInput,
    message,
  );
  screen.appendChild(panel);
  mount.appendChild(screen);

  return screen;
}

function createButton(label: string, dataAttribute: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.setAttribute(dataAttribute, "true");

  return button;
}
