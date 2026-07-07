import type { WebRtcRoom } from "./webRtcRoom";

export interface WebRtcSignalingPanelOptions {
  onLeave?: () => void;
}

export function renderWebRtcSignalingPanel(
  mount: HTMLElement,
  room: WebRtcRoom,
  options: WebRtcSignalingPanelOptions = {},
): HTMLElement {
  mount.querySelector("[data-webrtc-signaling-panel]")?.remove();

  const panel = document.createElement("section");
  panel.className = "webrtc-signaling-panel";
  panel.setAttribute("data-webrtc-signaling-panel", "true");

  const title = document.createElement("strong");
  title.textContent = `WebRTC ${room.sessionId}`;

  const status = document.createElement("span");
  status.className = "webrtc-signaling-panel__status";
  status.setAttribute("data-webrtc-status", "true");
  status.textContent = "수동 연결 대기";

  const localSignal = document.createElement("textarea");
  localSignal.className = "webrtc-signaling-panel__textarea";
  localSignal.readOnly = true;
  localSignal.placeholder = "내 signal";
  localSignal.setAttribute("data-webrtc-local-signal", "true");

  const remoteSignal = document.createElement("textarea");
  remoteSignal.className = "webrtc-signaling-panel__textarea";
  remoteSignal.placeholder = "상대 signal 붙여넣기";
  remoteSignal.setAttribute("data-webrtc-remote-signal", "true");

  const actions = document.createElement("div");
  actions.className = "webrtc-signaling-panel__actions";

  const createOfferButton = createButton("Offer 생성", "data-webrtc-create-offer");
  const acceptOfferButton = createButton("Offer 적용", "data-webrtc-accept-offer");
  const acceptAnswerButton = createButton("Answer 적용", "data-webrtc-accept-answer");
  const leaveButton = createButton("나가기", "data-webrtc-leave");
  leaveButton.classList.add("webrtc-signaling-panel__button--danger");
  const actionButtons = [createOfferButton, acceptOfferButton, acceptAnswerButton, leaveButton];

  createOfferButton.addEventListener("click", () => {
    runSignalingAction(status, async () => {
      localSignal.value = await room.createOfferSignal();
      status.textContent = "Offer 생성 완료";
    });
  });
  acceptOfferButton.addEventListener("click", () => {
    runSignalingAction(status, async () => {
      localSignal.value = await room.acceptOfferSignal(remoteSignal.value.trim());
      status.textContent = "Answer 생성 완료";
    });
  });
  acceptAnswerButton.addEventListener("click", () => {
    runSignalingAction(status, async () => {
      await room.acceptAnswerSignal(remoteSignal.value.trim());
      status.textContent = "Answer 적용 완료";
    });
  });
  leaveButton.addEventListener("click", () => {
    room.dispose();
    options.onLeave?.();
    status.textContent = "연결 종료";
    localSignal.disabled = true;
    remoteSignal.disabled = true;
    actionButtons.forEach(button => {
      button.disabled = true;
    });
  });

  actions.append(createOfferButton, acceptOfferButton, acceptAnswerButton, leaveButton);
  panel.append(title, status, localSignal, remoteSignal, actions);
  mount.appendChild(panel);

  return panel;
}

function createButton(label: string, dataAttribute: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "webrtc-signaling-panel__button";
  button.textContent = label;
  button.setAttribute(dataAttribute, "true");

  return button;
}

function runSignalingAction(status: HTMLElement, action: () => Promise<void>): void {
  status.textContent = "처리 중";
  void action().catch((error: unknown) => {
    status.textContent = error instanceof Error ? error.message : "WebRTC 처리 실패";
  });
}
