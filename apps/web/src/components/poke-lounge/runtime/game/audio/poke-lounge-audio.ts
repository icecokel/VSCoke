import type {
  PokeLoungeAudioManifest,
  PokeLoungeSfxId,
  PokeLoungeSfxManifestItem,
} from "./poke-lounge-audio.types";

const AUDIO_MANIFEST_PATH = "/assets/poke-lounge/audio/audio-manifest.json";
const MAX_PRELOADED_BYTES = 500_000;

let manifestPromise: Promise<PokeLoungeAudioManifest> | null = null;
let audioContext: AudioContext | null = null;
let muted = false;
const bufferPromises = new Map<PokeLoungeSfxId, Promise<AudioBuffer | null>>();
const htmlAudioElements = new Map<PokeLoungeSfxId, HTMLAudioElement>();

export function bindPokeLoungeAudioPrimeListeners(target: HTMLElement): () => void {
  const prime = () => {
    void primePokeLoungeAudio();
    remove();
  };
  const remove = () => {
    target.removeEventListener("pointerdown", prime);
    target.removeEventListener("keydown", prime);
    target.removeEventListener("touchstart", prime);
  };

  target.addEventListener("pointerdown", prime, { passive: true });
  target.addEventListener("keydown", prime);
  target.addEventListener("touchstart", prime, { passive: true });

  return remove;
}

export async function primePokeLoungeAudio(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const context = getAudioContext();
  if (context?.state === "suspended") {
    await context.resume().catch(() => undefined);
  }

  const manifest = await loadAudioManifest().catch(() => null);
  if (!manifest) {
    return;
  }

  const totalBytes = manifest.sfx.reduce((sum, item) => sum + item.sizeBytes, 0);
  if (context && totalBytes <= MAX_PRELOADED_BYTES) {
    await Promise.all(manifest.sfx.map(item => loadAudioBuffer(item))).catch(() => undefined);
    return;
  }

  manifest.sfx.forEach(item => {
    getHtmlAudioElement(item);
  });
}

export function playPokeLoungeSfx(id: PokeLoungeSfxId, options: { volume?: number } = {}): void {
  if (muted || typeof window === "undefined") {
    return;
  }

  void playPokeLoungeSfxAsync(id, options);
}

export function setPokeLoungeAudioMuted(nextMuted: boolean): void {
  muted = nextMuted;
}

export function getPokeLoungeAudioMuted(): boolean {
  return muted;
}

async function playPokeLoungeSfxAsync(
  id: PokeLoungeSfxId,
  options: { volume?: number },
): Promise<void> {
  const item = await getManifestItem(id);
  if (!item) {
    return;
  }

  const context = getAudioContext();
  if (context) {
    const played = await playWithWebAudio(context, item, options.volume).catch(() => false);
    if (played) {
      return;
    }
  }

  await playWithHtmlAudio(item, options.volume).catch(() => undefined);
}

async function getManifestItem(id: PokeLoungeSfxId): Promise<PokeLoungeSfxManifestItem | null> {
  const manifest = await loadAudioManifest().catch(() => null);

  return manifest?.sfx.find(item => item.id === id) ?? null;
}

function loadAudioManifest(): Promise<PokeLoungeAudioManifest> {
  manifestPromise ??= fetch(AUDIO_MANIFEST_PATH, { cache: "force-cache" }).then(async response => {
    if (!response.ok) {
      throw new Error(`Failed to load Poke Lounge audio manifest: ${response.status}`);
    }

    return (await response.json()) as PokeLoungeAudioManifest;
  });

  return manifestPromise;
}

async function playWithWebAudio(
  context: AudioContext,
  item: PokeLoungeSfxManifestItem,
  requestedVolume?: number,
): Promise<boolean> {
  if (context.state === "suspended") {
    await context.resume().catch(() => undefined);
  }

  if (context.state === "suspended") {
    return false;
  }

  const buffer = await loadAudioBuffer(item);
  if (!buffer) {
    return false;
  }

  const source = context.createBufferSource();
  const gain = context.createGain();
  gain.gain.value = clampVolume(requestedVolume ?? item.defaultVolume);
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(context.destination);
  source.start();

  return true;
}

function loadAudioBuffer(item: PokeLoungeSfxManifestItem): Promise<AudioBuffer | null> {
  const cached = bufferPromises.get(item.id);
  if (cached) {
    return cached;
  }

  const promise = fetch(item.src, { cache: "force-cache" })
    .then(async response => {
      if (!response.ok) {
        throw new Error(`Failed to load Poke Lounge audio asset: ${item.src}`);
      }

      return response.arrayBuffer();
    })
    .then(arrayBuffer => decodeAudioData(arrayBuffer))
    .catch(() => null);

  bufferPromises.set(item.id, promise);

  return promise;
}

function decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  const context = getAudioContext();
  if (!context) {
    return Promise.reject(new Error("AudioContext is unavailable"));
  }

  return new Promise((resolve, reject) => {
    const maybePromise = context.decodeAudioData(arrayBuffer, resolve, reject);

    if (maybePromise) {
      maybePromise.then(resolve, reject);
    }
  });
}

async function playWithHtmlAudio(
  item: PokeLoungeSfxManifestItem,
  requestedVolume?: number,
): Promise<void> {
  const audio = getHtmlAudioElement(item).cloneNode(true) as HTMLAudioElement;
  audio.volume = clampVolume(requestedVolume ?? item.defaultVolume);
  audio.currentTime = 0;
  await audio.play();
}

function getHtmlAudioElement(item: PokeLoungeSfxManifestItem): HTMLAudioElement {
  const cached = htmlAudioElements.get(item.id);
  if (cached) {
    return cached;
  }

  const audio = new Audio(item.src);
  audio.preload = "auto";
  audio.volume = item.defaultVolume;
  htmlAudioElements.set(item.id, audio);

  return audio;
}

function getAudioContext(): AudioContext | null {
  if (audioContext) {
    return audioContext;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextConstructor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  audioContext = new AudioContextConstructor();

  return audioContext;
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, value));
}
