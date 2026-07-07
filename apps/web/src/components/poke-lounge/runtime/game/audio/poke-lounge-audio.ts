import type {
  PokeLoungeAudioManifest,
  PokeLoungeBgmId,
  PokeLoungeBgmManifestItem,
  PokeLoungeSfxId,
  PokeLoungeSfxManifestItem,
} from "./poke-lounge-audio.types";

const AUDIO_MANIFEST_PATH = "/assets/poke-lounge/audio/audio-manifest.json";
const MAX_PRELOADED_BYTES = 500_000;

type PokeLoungeAudioItemId = PokeLoungeSfxId | PokeLoungeBgmId;
type PokeLoungeAudioManifestItem = PokeLoungeSfxManifestItem | PokeLoungeBgmManifestItem;

let manifestPromise: Promise<PokeLoungeAudioManifest> | null = null;
let audioContext: AudioContext | null = null;
let muted = false;
let masterVolume = 1;
const bufferPromises = new Map<PokeLoungeSfxId, Promise<AudioBuffer | null>>();
const htmlAudioElements = new Map<PokeLoungeAudioItemId, HTMLAudioElement>();
let activeBgm: {
  id: PokeLoungeBgmId;
  audio: HTMLAudioElement;
  baseVolume: number;
} | null = null;

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
  } else {
    manifest.sfx.forEach(item => {
      getHtmlAudioElement(item);
    });
  }

  manifest.bgm.forEach(item => {
    getHtmlAudioElement(item);
  });
}

export function playPokeLoungeSfx(id: PokeLoungeSfxId, options: { volume?: number } = {}): void {
  if (muted || typeof window === "undefined") {
    return;
  }

  void playPokeLoungeSfxAsync(id, options);
}

export function playPokeLoungeBgm(id: PokeLoungeBgmId, options: { volume?: number } = {}): void {
  if (muted || typeof window === "undefined") {
    return;
  }

  void playPokeLoungeBgmAsync(id, options).catch(() => undefined);
}

export function stopPokeLoungeBgm(id?: PokeLoungeBgmId): void {
  if (id && activeBgm?.id !== id) {
    return;
  }

  if (!activeBgm) {
    return;
  }

  activeBgm.audio.pause();
  activeBgm.audio.currentTime = 0;
  activeBgm = null;
}

export function setPokeLoungeAudioMuted(nextMuted: boolean): void {
  muted = nextMuted;

  if (muted) {
    stopPokeLoungeBgm();
  }
}

export function setPokeLoungeMasterVolume(nextVolume: number): void {
  masterVolume = clampVolume(nextVolume);

  if (activeBgm) {
    activeBgm.audio.volume = resolveVolume(activeBgm.baseVolume, 1);
  }
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

async function playPokeLoungeBgmAsync(
  id: PokeLoungeBgmId,
  options: { volume?: number },
): Promise<void> {
  const item = await getManifestBgmItem(id);
  if (!item) {
    return;
  }

  const context = getAudioContext();
  if (context?.state === "suspended") {
    await context.resume().catch(() => undefined);
  }

  if (activeBgm?.id && activeBgm.id !== id) {
    stopPokeLoungeBgm();
  }

  const audio = activeBgm?.id === id ? activeBgm.audio : getHtmlAudioElement(item);
  const baseVolume = options.volume ?? item.defaultVolume;
  audio.loop = true;
  audio.volume = resolveVolume(baseVolume, 1);

  if (activeBgm?.id !== id) {
    audio.currentTime = 0;
  }

  activeBgm = { id, audio, baseVolume };
  await audio.play();
}

async function getManifestItem(id: PokeLoungeSfxId): Promise<PokeLoungeSfxManifestItem | null> {
  const manifest = await loadAudioManifest().catch(() => null);

  return manifest?.sfx.find(item => item.id === id) ?? null;
}

async function getManifestBgmItem(id: PokeLoungeBgmId): Promise<PokeLoungeBgmManifestItem | null> {
  const manifest = await loadAudioManifest().catch(() => null);

  return manifest?.bgm.find(item => item.id === id) ?? null;
}

function loadAudioManifest(): Promise<PokeLoungeAudioManifest> {
  manifestPromise ??= fetch(AUDIO_MANIFEST_PATH, { cache: "force-cache" }).then(async response => {
    if (!response.ok) {
      throw new Error(`Failed to load Poke Lounge audio manifest: ${response.status}`);
    }

    const manifest = (await response.json()) as PokeLoungeAudioManifest;

    return {
      ...manifest,
      bgm: Array.isArray(manifest.bgm) ? manifest.bgm : [],
    };
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
  gain.gain.value = resolveVolume(requestedVolume, item.defaultVolume);
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
  audio.volume = resolveVolume(requestedVolume, item.defaultVolume);
  audio.currentTime = 0;
  await audio.play();
}

function getHtmlAudioElement(item: PokeLoungeAudioManifestItem): HTMLAudioElement {
  const cached = htmlAudioElements.get(item.id);
  if (cached) {
    return cached;
  }

  const audio = new Audio(item.src);
  audio.preload = "auto";
  audio.volume = resolveVolume(undefined, item.defaultVolume);
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

function resolveVolume(requestedVolume: number | undefined, defaultVolume: number): number {
  return clampVolume((requestedVolume ?? defaultVolume) * masterVolume);
}
