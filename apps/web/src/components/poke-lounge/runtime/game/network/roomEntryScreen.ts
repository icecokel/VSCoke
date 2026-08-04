import {
  createInviteUrl,
  normalizeRoomRoundDurationMs,
  createRoomCode as defaultCreateRoomCode,
  normalizeRoomCode,
  ROOM_ROUND_DURATION_OPTIONS_MS,
  ROOM_ROUND_DURATION_QUERY_PARAM,
  type RoomEntryMode,
  type RoomRoundDurationMs,
} from "./roomEntry";
import { playPokeLoungeSfx, primePokeLoungeAudio } from "../audio/poke-lounge-audio";
import { getPokeLoungeCopyForUrl, type PokeLoungeCopy } from "../../../poke-lounge-copy";

const DEFAULT_SELECTED_ROUND_DURATION_MS = 300_000;
const MAX_MULTIPLAYER_DISPLAY_NAME_LENGTH = 12;
const LOCAL_ROOM_CODE_INPUT_ID = "poke-lounge-local-room-code";
const MULTIPLAYER_DISPLAY_NAME_INPUT_ID = "poke-lounge-multiplayer-display-name";
const INVITE_INPUT_ID = "poke-lounge-room-invite";
const INVITE_DESCRIPTION_ID = "poke-lounge-room-invite-description";
const NEW_GAME_DIALOG_TITLE_ID = "poke-lounge-new-game-dialog-title";
const NEW_GAME_DIALOG_DESCRIPTION_ID = "poke-lounge-new-game-dialog-description";

export interface RoomEntrySelection {
  mode: Exclude<RoomEntryMode, "unset">;
  roomCode: string | null;
  inviteUrl: string | null;
  displayName?: string;
  createRoom?: boolean;
  roundDurationMs?: RoomRoundDurationMs;
  resetSession?: boolean;
}

export function shouldResetRoomEntrySession(selection: RoomEntrySelection): boolean {
  return selection.mode === "solo" && selection.resetSession === true;
}

export interface RoomEntryScreenOptions {
  currentUrl: URL;
  createRoomCode?: () => string;
  initialDisplayName?: string;
  localTestMode?: {
    active: boolean;
    onExit(): void;
    onStart(): void;
  };
  onSelect(selection: RoomEntrySelection): void;
}

export interface DirectMultiplayerEntryScreenOptions {
  currentUrl: URL;
  initialDisplayName?: string;
  onSubmit(displayName: string): void;
}

export function renderDirectMultiplayerEntryScreen(
  mount: HTMLElement,
  options: DirectMultiplayerEntryScreenOptions,
): HTMLElement {
  mount.innerHTML = "";

  const copy = getPokeLoungeCopyForUrl(options.currentUrl);
  const screen = document.createElement("section");
  screen.className = "room-entry-screen";
  screen.setAttribute("data-room-entry-direct-multiplayer", "true");

  const panel = document.createElement("div");
  panel.className = "room-entry-panel";

  const title = document.createElement("h1");
  title.textContent = copy.roomEntry.multiplayerEntryTitle;

  const fanNotice = document.createElement("p");
  fanNotice.className = "room-entry-notice";
  fanNotice.setAttribute("data-poke-lounge-fan-notice", "true");
  fanNotice.textContent = copy.roomEntry.fanNotice;

  const message = document.createElement("p");
  message.className = "room-entry-message";
  message.setAttribute("data-room-entry-message", "true");
  message.setAttribute("role", "alert");
  message.setAttribute("aria-live", "assertive");
  message.setAttribute("aria-atomic", "true");

  const multiplayerDisplayNameInput = createMultiplayerDisplayNameInput(
    options.initialDisplayName,
    copy.roomEntry.multiplayerNamePlaceholder,
  );
  multiplayerDisplayNameInput.setAttribute("data-room-entry-direct-multiplayer-name", "true");
  const multiplayerDisplayNameDescription = document.createElement("p");
  multiplayerDisplayNameDescription.className = "room-entry-field-copy";
  multiplayerDisplayNameDescription.textContent = copy.roomEntry.multiplayerNameDescription;
  const multiplayerDisplayNameField = createLabeledField(
    copy.roomEntry.multiplayerNameLabel,
    MULTIPLAYER_DISPLAY_NAME_INPUT_ID,
    multiplayerDisplayNameInput,
    multiplayerDisplayNameDescription,
  );
  multiplayerDisplayNameField.classList.add("room-entry-multiplayer-name");

  const submit = () => {
    const displayName = getMultiplayerDisplayName(
      multiplayerDisplayNameInput,
      message,
      copy.roomEntry.multiplayerNameRequired,
    );

    if (!displayName) {
      return;
    }

    playRoomEntryConfirmSound();
    message.textContent = "";
    options.onSubmit(displayName);
  };
  const submitButton = createButton(
    copy.roomEntry.multiplayerEntrySubmit,
    "data-room-entry-direct-multiplayer-submit",
  );
  submitButton.addEventListener("click", submit);
  multiplayerDisplayNameInput.addEventListener("input", () => {
    multiplayerDisplayNameInput.removeAttribute("aria-invalid");
  });
  multiplayerDisplayNameInput.addEventListener("keydown", event => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    submit();
  });

  panel.append(title, fanNotice, multiplayerDisplayNameField, submitButton, message);
  screen.appendChild(panel);
  mount.appendChild(screen);

  return screen;
}

export function renderRoomEntryScreen(
  mount: HTMLElement,
  options: RoomEntryScreenOptions,
): HTMLElement {
  mount.innerHTML = "";

  const copy = getPokeLoungeCopyForUrl(options.currentUrl);
  const screen = document.createElement("section");
  screen.className = "room-entry-screen";
  screen.setAttribute("data-room-entry-screen", "true");
  screen.toggleAttribute("data-local-test-mode-active", options.localTestMode?.active === true);

  const panel = document.createElement("div");
  panel.className = "room-entry-panel";

  const title = document.createElement("h1");
  title.textContent = copy.roomEntry.title;

  const fanNotice = document.createElement("p");
  fanNotice.className = "room-entry-notice";
  fanNotice.setAttribute("data-poke-lounge-fan-notice", "true");
  fanNotice.textContent = copy.roomEntry.fanNotice;

  const multiplayerDisplayNameInput = createMultiplayerDisplayNameInput(
    options.initialDisplayName,
    copy.roomEntry.multiplayerNamePlaceholder,
  );
  const multiplayerDisplayNameDescription = document.createElement("p");
  multiplayerDisplayNameDescription.className = "room-entry-field-copy";
  multiplayerDisplayNameDescription.textContent = copy.roomEntry.multiplayerNameDescription;
  const multiplayerDisplayNameField = createLabeledField(
    copy.roomEntry.multiplayerNameLabel,
    MULTIPLAYER_DISPLAY_NAME_INPUT_ID,
    multiplayerDisplayNameInput,
    multiplayerDisplayNameDescription,
  );
  multiplayerDisplayNameField.classList.add("room-entry-multiplayer-name");

  const soloMode = createModeGroup(
    "solo",
    copy.roomEntry.soloTitle,
    copy.roomEntry.soloDescription,
  );
  const soloActions = document.createElement("div");
  soloActions.className = "room-entry-mode-actions";
  const soloButton = createButton(copy.roomEntry.continue, "data-room-entry-solo");
  const newStartButton = createButton(copy.roomEntry.newGame, "data-room-entry-new-start");
  newStartButton.classList.add("room-entry-new-game-button");
  soloActions.append(soloButton, newStartButton);
  soloMode.content.appendChild(soloActions);

  let localTestStartButton: HTMLButtonElement | null = null;
  let localTestExitButton: HTMLButtonElement | null = null;
  if (options.localTestMode) {
    const localTestMode = document.createElement("section");
    localTestMode.className = "room-entry-local-test";
    localTestMode.setAttribute("data-room-entry-local-test", "true");
    localTestMode.toggleAttribute("data-local-test-mode-active", options.localTestMode.active);

    const localTestTitle = document.createElement("h3");
    localTestTitle.className = "room-entry-field-label";
    localTestTitle.textContent = copy.roomEntry.localTestTitle;

    const localTestDescription = document.createElement("p");
    localTestDescription.className = "room-entry-field-copy";
    localTestDescription.textContent = copy.roomEntry.localTestDescription;

    const localTestActions = document.createElement("div");
    localTestActions.className = "room-entry-local-test-actions";
    localTestStartButton = createButton(
      options.localTestMode.active
        ? copy.roomEntry.localTestContinue
        : copy.roomEntry.localTestStart,
      "data-room-entry-local-test-start",
    );
    localTestActions.appendChild(localTestStartButton);

    if (options.localTestMode.active) {
      localTestExitButton = createButton(
        copy.roomEntry.localTestExit,
        "data-room-entry-local-test-exit",
      );
      localTestActions.appendChild(localTestExitButton);
    }

    localTestMode.append(localTestTitle, localTestDescription, localTestActions);
    soloMode.content.appendChild(localTestMode);
  }

  let selectedRoundDurationMs = readInitialRoundDurationMs(options.currentUrl);
  const roundDurationPicker = createRoundDurationPicker(
    selectedRoundDurationMs,
    durationMs => {
      selectedRoundDurationMs = durationMs;
    },
    copy,
  );
  const settingsGroup = document.createElement("section");
  settingsGroup.className = "room-entry-settings-group";
  settingsGroup.setAttribute("data-room-entry-settings", "true");
  const settingsTitle = document.createElement("h2");
  settingsTitle.textContent = copy.roomEntry.tournamentSettings;
  const settingsCopy = document.createElement("p");
  settingsCopy.className = "room-entry-settings-copy";
  settingsCopy.textContent = copy.roomEntry.tournamentSettingsDescription;
  settingsGroup.append(settingsTitle, settingsCopy, roundDurationPicker);

  const localMode = createModeGroup(
    "local",
    copy.roomEntry.localTitle,
    copy.roomEntry.localDescription,
  );
  const createButtonElement = createButton(copy.roomEntry.localCreate, "data-room-entry-create");
  const roomCodeInput = createRoomCodeInput(
    LOCAL_ROOM_CODE_INPUT_ID,
    copy.roomEntry.roomCodePlaceholder,
    "data-room-entry-code",
  );
  const joinButton = createButton(copy.roomEntry.localJoin, "data-room-entry-join");
  const localJoinRow = createActionRow(roomCodeInput, joinButton);
  const localCodeField = createLabeledField(
    copy.roomEntry.localCodeLabel,
    LOCAL_ROOM_CODE_INPUT_ID,
    localJoinRow,
  );
  localMode.content.append(createButtonElement, localCodeField);

  const inviteInput = document.createElement("input");
  inviteInput.id = INVITE_INPUT_ID;
  inviteInput.type = "text";
  inviteInput.readOnly = true;
  inviteInput.placeholder = copy.roomEntry.invitePlaceholder;
  inviteInput.setAttribute("data-room-entry-invite", "true");
  inviteInput.setAttribute("aria-describedby", INVITE_DESCRIPTION_ID);

  const inviteDescription = document.createElement("p");
  inviteDescription.id = INVITE_DESCRIPTION_ID;
  inviteDescription.className = "room-entry-field-copy";
  inviteDescription.setAttribute("data-room-entry-invite-description", "true");
  inviteDescription.textContent = copy.roomEntry.inviteDescription;
  const inviteField = createLabeledField(
    copy.roomEntry.inviteLabel,
    INVITE_INPUT_ID,
    inviteInput,
    inviteDescription,
  );
  inviteField.classList.add("room-entry-invite-field");

  const message = document.createElement("p");
  message.className = "room-entry-message";
  message.setAttribute("data-room-entry-message", "true");
  message.setAttribute("role", "alert");
  message.setAttribute("aria-live", "assertive");
  message.setAttribute("aria-atomic", "true");

  const newGameDialog = createNewGameConfirmationDialog(copy, () => {
    message.textContent = "";
    options.onSelect({
      mode: "solo",
      roomCode: null,
      inviteUrl: null,
      resetSession: true,
    });
  });

  const selectLocalRoom = (roomCode: string, roundDurationMs?: RoomRoundDurationMs) => {
    const displayName = getMultiplayerDisplayName(
      multiplayerDisplayNameInput,
      message,
      copy.roomEntry.multiplayerNameRequired,
    );

    if (!displayName) {
      return;
    }

    playRoomEntryConfirmSound();
    const inviteUrl = createInviteUrl(options.currentUrl, roomCode, roundDurationMs).href;
    inviteInput.value = inviteUrl;
    message.textContent = "";
    options.onSelect({
      mode: "local-room",
      roomCode,
      inviteUrl,
      displayName,
      ...(roundDurationMs ? { roundDurationMs } : {}),
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

  localTestStartButton?.addEventListener("click", () => {
    playRoomEntryConfirmSound();
    message.textContent = "";
    options.localTestMode?.onStart();
  });

  localTestExitButton?.addEventListener("click", () => {
    playRoomEntryConfirmSound();
    message.textContent = "";
    options.localTestMode?.onExit();
  });

  newStartButton.addEventListener("click", () => {
    playRoomEntryConfirmSound();
    openConfirmationDialog(newGameDialog.dialog, newGameDialog.cancelButton);
  });

  createButtonElement.addEventListener("click", () => {
    selectLocalRoom((options.createRoomCode ?? defaultCreateRoomCode)(), selectedRoundDurationMs);
  });

  joinButton.addEventListener("click", () => {
    const roomCode = normalizeRoomCode(roomCodeInput.value);

    if (!roomCode) {
      roomCodeInput.setAttribute("aria-invalid", "true");
      message.textContent = copy.roomEntry.localCodeRequired;
      return;
    }

    roomCodeInput.removeAttribute("aria-invalid");
    selectLocalRoom(roomCode);
  });

  roomCodeInput.addEventListener("input", () => {
    roomCodeInput.removeAttribute("aria-invalid");
  });

  panel.append(title, fanNotice, soloMode.element);
  if (!options.localTestMode?.active) {
    panel.append(multiplayerDisplayNameField, settingsGroup, localMode.element, inviteField);
  }
  panel.append(message, newGameDialog.dialog);
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

function createModeGroup(
  mode: "solo" | "local",
  titleText: string,
  descriptionText: string,
  descriptionId = `poke-lounge-${mode}-mode-description`,
): { element: HTMLElement; content: HTMLElement } {
  const element = document.createElement("section");
  element.className = "room-entry-mode-group";
  element.setAttribute("data-room-entry-mode", mode);

  const title = document.createElement("h2");
  title.className = "room-entry-mode-heading";
  title.textContent = titleText;

  const description = document.createElement("p");
  description.id = descriptionId;
  description.className = "room-entry-mode-copy";
  description.textContent = descriptionText;

  const content = document.createElement("div");
  content.className = "room-entry-mode-content";

  element.append(title, description, content);

  return { element, content };
}

function createRoomCodeInput(
  id: string,
  placeholder: string,
  dataAttribute: string,
): HTMLInputElement {
  const input = document.createElement("input");
  input.id = id;
  input.type = "text";
  input.inputMode = "text";
  input.autocomplete = "off";
  input.maxLength = 6;
  input.placeholder = placeholder;
  input.setAttribute(dataAttribute, "true");

  return input;
}

function createMultiplayerDisplayNameInput(
  initialDisplayName: string | undefined,
  placeholder: string,
): HTMLInputElement {
  const input = document.createElement("input");
  input.id = MULTIPLAYER_DISPLAY_NAME_INPUT_ID;
  input.type = "text";
  input.autocomplete = "off";
  input.maxLength = MAX_MULTIPLAYER_DISPLAY_NAME_LENGTH;
  input.placeholder = placeholder;
  input.value = normalizeMultiplayerDisplayName(initialDisplayName ?? "");
  input.setAttribute("data-room-entry-display-name", "true");

  return input;
}

function getMultiplayerDisplayName(
  input: HTMLInputElement,
  message: HTMLElement,
  requiredMessage: string,
): string | null {
  const displayName = normalizeMultiplayerDisplayName(input.value);
  input.value = displayName;

  if (!displayName) {
    input.setAttribute("aria-invalid", "true");
    message.textContent = requiredMessage;
    input.focus();
    return null;
  }

  input.removeAttribute("aria-invalid");
  return displayName;
}

export function normalizeMultiplayerDisplayName(value: string): string {
  return Array.from(value.trim()).slice(0, MAX_MULTIPLAYER_DISPLAY_NAME_LENGTH).join("");
}

function createActionRow(input: HTMLInputElement, button: HTMLButtonElement): HTMLElement {
  const row = document.createElement("div");
  row.className = "room-entry-action-row";
  row.append(input, button);

  return row;
}

function createLabeledField(
  labelText: string,
  inputId: string,
  control: HTMLElement,
  description?: HTMLElement,
): HTMLElement {
  const field = document.createElement("div");
  field.className = "room-entry-field";

  const label = document.createElement("label");
  label.className = "room-entry-field-label";
  label.htmlFor = inputId;
  label.textContent = labelText;

  field.append(label, control);
  if (description) {
    field.appendChild(description);
  }

  return field;
}

function createNewGameConfirmationDialog(
  copy: PokeLoungeCopy,
  onConfirm: () => void,
): {
  dialog: HTMLDialogElement;
  cancelButton: HTMLButtonElement;
} {
  const dialog = document.createElement("dialog");
  dialog.className = "room-entry-confirm-dialog";
  dialog.setAttribute("data-room-entry-new-start-dialog", "true");
  dialog.setAttribute("role", "alertdialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", NEW_GAME_DIALOG_TITLE_ID);
  dialog.setAttribute("aria-describedby", NEW_GAME_DIALOG_DESCRIPTION_ID);

  const content = document.createElement("div");
  content.className = "room-entry-confirm-dialog-content";

  const title = document.createElement("h2");
  title.id = NEW_GAME_DIALOG_TITLE_ID;
  title.textContent = copy.roomEntry.newGameTitle;

  const description = document.createElement("p");
  description.id = NEW_GAME_DIALOG_DESCRIPTION_ID;
  description.className = "room-entry-confirm-dialog-copy";
  description.textContent = copy.roomEntry.newGameDescription;

  const actions = document.createElement("div");
  actions.className = "room-entry-confirm-dialog-actions";
  const cancelButton = createButton(copy.roomEntry.cancel, "data-room-entry-new-start-cancel");
  const confirmButton = createButton(
    copy.roomEntry.resetAndStart,
    "data-room-entry-new-start-confirm",
  );
  confirmButton.classList.add("room-entry-confirm-dialog-danger");

  cancelButton.addEventListener("click", () => {
    closeConfirmationDialog(dialog);
  });
  confirmButton.addEventListener("click", () => {
    closeConfirmationDialog(dialog);
    playRoomEntryConfirmSound();
    onConfirm();
  });

  actions.append(cancelButton, confirmButton);
  content.append(title, description, actions);
  dialog.appendChild(content);

  return { dialog, cancelButton };
}

function openConfirmationDialog(dialog: HTMLDialogElement, initialFocus: HTMLButtonElement): void {
  if (dialog.open) {
    return;
  }

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "true");
  }

  initialFocus.focus();
}

function closeConfirmationDialog(dialog: HTMLDialogElement): void {
  if (typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
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
  copy: PokeLoungeCopy,
): HTMLElement {
  let activeDurationMs = selectedDurationMs;
  const field = document.createElement("div");
  field.className = "room-entry-round-duration";
  field.setAttribute("data-room-entry-round-duration", "true");

  const label = document.createElement("p");
  label.textContent = copy.roomEntry.preparationTime;

  const durationOptions = document.createElement("div");
  durationOptions.className = "room-entry-round-duration-options";
  durationOptions.setAttribute("role", "group");
  durationOptions.setAttribute("aria-label", copy.roomEntry.preparationTime);

  const buttons = ROOM_ROUND_DURATION_OPTIONS_MS.map(durationMs => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = copy.roomEntry.durationMinutes(durationMs / 60_000);
    button.setAttribute("data-room-entry-round-duration-option", String(durationMs));

    button.addEventListener("click", () => {
      activeDurationMs = durationMs;
      onSelect(durationMs);
      syncButtons();
    });

    durationOptions.appendChild(button);
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
  field.append(label, durationOptions);

  return field;
}
