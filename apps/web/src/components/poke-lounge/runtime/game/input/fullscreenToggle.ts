const FALLBACK_CLASS = "is-game-fullscreen-fallback";
const BODY_FALLBACK_CLASS = "is-game-fullscreen-fallback-active";

const cleanupByMount = new WeakMap<HTMLElement, AbortController>();

export function renderFullscreenToggle(mount: HTMLElement): HTMLButtonElement {
  cleanupByMount.get(mount)?.abort();
  mount.querySelector("[data-fullscreen-toggle]")?.remove();

  const target = findFullscreenTarget(mount);
  const controller = new AbortController();
  cleanupByMount.set(mount, controller);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "fullscreen-toggle-button";
  button.textContent = "⛶";
  button.setAttribute("data-fullscreen-toggle", "true");

  const updateButton = () => {
    const active = isFullscreenActive(target);
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

  updateButton();
  mount.appendChild(button);

  return button;
}

function findFullscreenTarget(mount: HTMLElement): HTMLElement {
  return mount.closest<HTMLElement>(".phaser-game-page") ?? mount.parentElement ?? mount;
}

async function toggleGameFullscreen(target: HTMLElement): Promise<void> {
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

function isFullscreenActive(target: HTMLElement): boolean {
  return (
    target.ownerDocument.fullscreenElement === target || target.classList.contains(FALLBACK_CLASS)
  );
}

function enableFullscreenFallback(target: HTMLElement): void {
  target.classList.add(FALLBACK_CLASS);
  target.ownerDocument.body.classList.add(BODY_FALLBACK_CLASS);
}

function disableFullscreenFallback(target: HTMLElement): void {
  target.classList.remove(FALLBACK_CLASS);
  target.ownerDocument.body.classList.remove(BODY_FALLBACK_CLASS);
}
