const FALLBACK_CLASS = "is-game-fullscreen-fallback";
const BODY_FALLBACK_CLASS = "is-game-fullscreen-fallback-active";
export const GAME_FULLSCREEN_STATE_EVENT = "poke-lounge-fullscreen-state-change";

const cleanupByMount = new WeakMap<HTMLElement, AbortController>();

interface FullscreenToggleOptions {
  className?: string;
  placement?: "mobile";
  target?: HTMLElement;
}

export function renderFullscreenToggle(
  mount: HTMLElement,
  options: FullscreenToggleOptions = {},
): HTMLButtonElement {
  cleanupByMount.get(mount)?.abort();
  const placementSelector = options.placement
    ? `[data-fullscreen-toggle-placement='${options.placement}']`
    : "[data-fullscreen-toggle]";
  mount.querySelector(placementSelector)?.remove();

  const target = options.target ?? findFullscreenTarget(mount);
  const controller = new AbortController();
  cleanupByMount.set(mount, controller);

  const button = document.createElement("button");
  button.type = "button";
  button.className = ["fullscreen-toggle-button", options.className].filter(Boolean).join(" ");
  button.textContent = "⛶";
  button.setAttribute("data-fullscreen-toggle", "true");
  if (options.placement) {
    button.setAttribute("data-fullscreen-toggle-placement", options.placement);
  }

  const updateButton = () => {
    const active = isGameFullscreenActive(target);
    button.setAttribute("aria-label", active ? "전체화면 끄기" : "전체화면 켜기");
    button.setAttribute("aria-pressed", active ? "true" : "false");
  };

  button.addEventListener(
    "click",
    () => {
      void toggleGameFullscreen(target).finally(updateButton);
    },
    { signal: controller.signal },
  );
  target.ownerDocument.addEventListener("fullscreenchange", updateButton, {
    signal: controller.signal,
  });
  target.ownerDocument.addEventListener(GAME_FULLSCREEN_STATE_EVENT, updateButton, {
    signal: controller.signal,
  });

  updateButton();
  mount.appendChild(button);

  return button;
}

function findFullscreenTarget(mount: HTMLElement): HTMLElement {
  return mount.closest<HTMLElement>(".phaser-game-page") ?? mount.parentElement ?? mount;
}

export async function toggleGameFullscreen(target: HTMLElement): Promise<void> {
  const doc = target.ownerDocument;

  if (doc.fullscreenElement) {
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
    }
    disableFullscreenFallback(target);
    return;
  }

  if (target.classList.contains(FALLBACK_CLASS)) {
    disableFullscreenFallback(target);
    return;
  }

  if (!target.requestFullscreen) {
    enableFullscreenFallback(target);
    return;
  }

  try {
    await target.requestFullscreen({ navigationUI: "hide" });
    disableFullscreenFallback(target);
  } catch {
    enableFullscreenFallback(target);
  }
}

export function isGameFullscreenActive(target: HTMLElement): boolean {
  return (
    target.ownerDocument.fullscreenElement === target || target.classList.contains(FALLBACK_CLASS)
  );
}

function enableFullscreenFallback(target: HTMLElement): void {
  target.classList.add(FALLBACK_CLASS);
  target.ownerDocument.body.classList.add(BODY_FALLBACK_CLASS);
  dispatchFullscreenStateChange(target);
}

function disableFullscreenFallback(target: HTMLElement): void {
  target.classList.remove(FALLBACK_CLASS);
  target.ownerDocument.body.classList.remove(BODY_FALLBACK_CLASS);
  dispatchFullscreenStateChange(target);
}

function dispatchFullscreenStateChange(target: HTMLElement): void {
  target.ownerDocument.dispatchEvent(new Event(GAME_FULLSCREEN_STATE_EVENT));
}
