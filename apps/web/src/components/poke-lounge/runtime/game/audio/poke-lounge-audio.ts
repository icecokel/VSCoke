import type {
  PokeLoungeAudioSource,
  PokeLoungeAudioManifest,
  PokeLoungeBgmId,
  PokeLoungeBgmManifestItem,
  PokeLoungeSfxId,
  PokeLoungeSfxManifestItem,
} from "./poke-lounge-audio.types";

export const POKE_LOUNGE_AUDIO_MANIFEST_CACHE_KEY = "pokeLoungeAudioManifest";
export const POKE_LOUNGE_AUDIO_MANIFEST_PATH = "/assets/poke-lounge/audio/audio-manifest.json";
const MAX_PRELOADED_BYTES = 500_000;
const POKE_LOUNGE_AUDIO_MANIFEST_VERSION = 2;
const POKE_LOUNGE_SFX_IDS = [
  "button-confirm",
  "button-cancel",
  "battle-start",
  "battle-hit",
  "battle-transition",
  "pokemon-faint",
] as const satisfies readonly PokeLoungeSfxId[];
const POKE_LOUNGE_BGM_IDS = [
  "field-day",
  "wild-battle",
] as const satisfies readonly PokeLoungeBgmId[];

type PokeLoungeAudioItemId = PokeLoungeSfxId | PokeLoungeBgmId;
type PokeLoungeAudioManifestItem = PokeLoungeSfxManifestItem | PokeLoungeBgmManifestItem;

export interface PokeLoungeAudioPreloadAsset {
  id: PokeLoungeAudioItemId;
  cacheKey: string;
  src: string;
}

export interface PokeLoungeAudioPlaybackSnapshot {
  activeBgmId: PokeLoungeBgmId | null;
  activeBufferSourceCount: number;
  activeHtmlAudioElementCount: number;
  isBgmPlaying: boolean;
  lastSfxId: PokeLoungeSfxId | null;
}

let manifestPromise: Promise<PokeLoungeAudioManifest> | null = null;
let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
const unlockedAudioContexts = new WeakSet<AudioContext>();
let muted = false;
let masterVolume = 1;
let playbackGeneration = 0;
let bgmRequestGeneration = 0;
let lastSfxId: PokeLoungeSfxId | null = null;
const bufferPromises = new Map<PokeLoungeAudioItemId, Promise<AudioBuffer | null>>();
const preloadedAudioBytes = new Map<PokeLoungeAudioItemId, ArrayBuffer>();
const htmlAudioElements = new Map<PokeLoungeAudioItemId, HTMLAudioElement>();
const htmlAudioGains = new WeakMap<HTMLAudioElement, GainNode>();
const audioObjectUrls = new Map<PokeLoungeAudioItemId, string>();
const activeBufferSources = new Set<AudioBufferSourceNode>();
const activeHtmlAudioElements = new Set<HTMLAudioElement>();
let activeBgm: {
  id: PokeLoungeBgmId;
  baseVolume: number;
  audio: HTMLAudioElement | null;
  gain: GainNode | null;
  source: AudioBufferSourceNode | null;
} | null = null;

export function bindPokeLoungeAudioPrimeListeners(target: HTMLElement): () => void {
  const prime = () => {
    void primePokeLoungeAudio().then(() => {
      if (!audioContext || audioContext.state === "running") {
        remove();
      }
    });
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
  if (context) {
    const resumePromise =
      context.state === "suspended" ? context.resume().catch(() => undefined) : Promise.resolve();
    startSilentAudioUnlock(context);
    await resumePromise;
    if (context.state === "running") {
      unlockedAudioContexts.add(context);
    }
  }

  const manifest = await loadAudioManifest().catch(() => null);
  if (!manifest) {
    return;
  }

  const audioItems = [...manifest.sfx, ...manifest.bgm];
  const totalBytes = audioItems.reduce((sum, item) => sum + item.sizeBytes, 0);
  if (context && totalBytes <= MAX_PRELOADED_BYTES) {
    await Promise.all(audioItems.map(item => loadAudioBuffer(item))).catch(() => undefined);
  } else {
    audioItems.forEach(item => {
      getHtmlAudioElement(item);
    });
  }

  if (
    activeBgm &&
    (!isActiveBgmPlaying() || (context?.state === "running" && activeBgm.audio !== null))
  ) {
    playPokeLoungeBgm(activeBgm.id, { volume: activeBgm.baseVolume });
  }
}

export function playPokeLoungeSfx(id: PokeLoungeSfxId, options: { volume?: number } = {}): void {
  if (muted || typeof window === "undefined") {
    return;
  }

  lastSfxId = id;
  void playPokeLoungeSfxAsync(id, options, playbackGeneration);
}

export function playPokeLoungeBgm(id: PokeLoungeBgmId, options: { volume?: number } = {}): void {
  if (muted || typeof window === "undefined") {
    return;
  }

  const requestGeneration = (bgmRequestGeneration += 1);
  void playPokeLoungeBgmAsync(id, options, playbackGeneration, requestGeneration).catch(
    () => undefined,
  );
}

export function stopPokeLoungeBgm(id?: PokeLoungeBgmId): void {
  bgmRequestGeneration += 1;

  if (id && activeBgm?.id !== id) {
    return;
  }

  if (!activeBgm) {
    return;
  }

  const bgm = activeBgm;
  activeBgm = null;
  if (bgm.source) {
    bgm.source.onended = null;
    try {
      bgm.source.stop();
    } catch {
      // 이미 종료된 WebAudio BGM 소스는 다시 중지할 수 없다.
    }
    activeBufferSources.delete(bgm.source);
    bgm.source.disconnect();
    bgm.gain?.disconnect();
  }
  if (bgm.audio) {
    stopHtmlAudioElement(bgm.audio);
  }
}

export function stopAllPokeLoungeAudio(): void {
  playbackGeneration += 1;
  lastSfxId = null;
  stopPokeLoungeBgm();

  for (const source of activeBufferSources) {
    source.onended = null;
    try {
      source.stop();
    } catch {
      // 이미 종료된 WebAudio 소스는 다시 중지할 수 없다.
    }
    source.disconnect();
  }
  activeBufferSources.clear();

  for (const audio of activeHtmlAudioElements) {
    stopHtmlAudioElement(audio);
  }
  activeHtmlAudioElements.clear();

  for (const audio of htmlAudioElements.values()) {
    stopHtmlAudioElement(audio);
  }
}

export function setPokeLoungeAudioMuted(nextMuted: boolean): void {
  muted = nextMuted;

  if (muted) {
    stopPokeLoungeBgm();
  }
}

export function setPokeLoungeMasterVolume(nextVolume: number): void {
  masterVolume = clampVolume(nextVolume);

  if (masterGain) {
    masterGain.gain.value = masterVolume;
    return;
  }

  if (activeBgm) {
    if (activeBgm.audio) {
      activeBgm.audio.volume = resolveVolume(activeBgm.baseVolume, 1);
    }
  }
}

export function getPokeLoungeAudioMuted(): boolean {
  return muted;
}

export function getPokeLoungeAudioPlaybackSnapshotForTest(): PokeLoungeAudioPlaybackSnapshot {
  return {
    activeBgmId: activeBgm?.id ?? null,
    activeBufferSourceCount: activeBufferSources.size,
    activeHtmlAudioElementCount: activeHtmlAudioElements.size,
    isBgmPlaying: isActiveBgmPlaying(),
    lastSfxId,
  };
}

export function parsePokeLoungeAudioManifest(value: unknown): PokeLoungeAudioManifest | null {
  if (!isRecord(value) || value.version !== POKE_LOUNGE_AUDIO_MANIFEST_VERSION) {
    return null;
  }

  const { bgm, sfx } = value;
  if (
    !Array.isArray(sfx) ||
    !sfx.every(isPokeLoungeSfxManifestItem) ||
    !Array.isArray(bgm) ||
    !bgm.every(isPokeLoungeBgmManifestItem) ||
    !hasExactAudioItemIds(sfx, POKE_LOUNGE_SFX_IDS) ||
    !hasExactAudioItemIds(bgm, POKE_LOUNGE_BGM_IDS)
  ) {
    return null;
  }

  return { version: value.version, sfx, bgm };
}

export function getPokeLoungeAudioPreloadAssets(
  manifest: PokeLoungeAudioManifest,
): PokeLoungeAudioPreloadAsset[] {
  return [...manifest.sfx, ...manifest.bgm].map(item => ({
    id: item.id,
    cacheKey: createPokeLoungeAudioPreloadCacheKey(item.id),
    src: item.src,
  }));
}

export function registerPreloadedPokeLoungeAudio(
  manifest: PokeLoungeAudioManifest,
  buffers: ReadonlyMap<PokeLoungeAudioItemId, ArrayBuffer>,
): void {
  manifestPromise = Promise.resolve(manifest);
  preloadedAudioBytes.clear();
  clearAudioObjectUrls();

  for (const item of [...manifest.sfx, ...manifest.bgm]) {
    const buffer = buffers.get(item.id);
    if (buffer) {
      preloadedAudioBytes.set(item.id, buffer);
    }
  }

  for (const item of manifest.sfx) {
    bufferPromises.delete(item.id);
  }

  for (const audio of htmlAudioElements.values()) {
    if (activeBgm?.audio !== audio) {
      audio.pause();
      audio.removeAttribute("src");
    }
  }
  htmlAudioElements.clear();
}

async function playPokeLoungeSfxAsync(
  id: PokeLoungeSfxId,
  options: { volume?: number },
  generation: number,
): Promise<void> {
  const item = await getManifestItem(id);
  if (!item || generation !== playbackGeneration) {
    return;
  }

  const context = getAudioContext();
  if (context) {
    const played = await playWithWebAudio(context, item, options.volume, generation).catch(
      () => false,
    );
    if (played) {
      return;
    }
  }

  if (generation === playbackGeneration) {
    await playWithHtmlAudio(item, options.volume, generation).catch(() => undefined);
  }
}

async function playPokeLoungeBgmAsync(
  id: PokeLoungeBgmId,
  options: { volume?: number },
  generation: number,
  requestGeneration: number,
): Promise<void> {
  const item = await getManifestBgmItem(id);
  if (!item || generation !== playbackGeneration || requestGeneration !== bgmRequestGeneration) {
    return;
  }

  const context = getAudioContext();
  if (context?.state === "suspended") {
    await context.resume().catch(() => undefined);
  }
  if (generation !== playbackGeneration || requestGeneration !== bgmRequestGeneration) {
    return;
  }

  if (activeBgm?.id === id && isActiveBgmPlaying()) {
    return;
  }

  const baseVolume = options.volume ?? item.defaultVolume;
  if (context?.state === "running") {
    const buffer = await loadAudioBuffer(item);
    if (
      !buffer ||
      generation !== playbackGeneration ||
      requestGeneration !== bgmRequestGeneration
    ) {
      return;
    }

    stopPokeLoungeBgm();
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.value = clampVolume(baseVolume);
    source.connect(gain);
    gain.connect(getMasterGain(context) ?? context.destination);
    activeBufferSources.add(source);
    activeBgm = { id, audio: null, baseVolume, gain, source };
    source.onended = () => {
      activeBufferSources.delete(source);
      source.disconnect();
      gain.disconnect();
      if (activeBgm?.source === source) {
        activeBgm = null;
      }
    };
    source.start();
    return;
  }

  if (activeBgm) {
    stopPokeLoungeBgm();
  }

  const audio = getHtmlAudioElement(item);
  audio.loop = true;
  audio.currentTime = 0;
  setHtmlAudioElementVolume(audio, baseVolume);
  activeBgm = { id, audio, baseVolume, gain: null, source: null };
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
  manifestPromise ??= fetch(POKE_LOUNGE_AUDIO_MANIFEST_PATH, { cache: "force-cache" }).then(
    async response => {
      if (!response.ok) {
        throw new Error(`Failed to load Poke Lounge audio manifest: ${response.status}`);
      }

      const manifest = parsePokeLoungeAudioManifest(await response.json());
      if (!manifest) {
        throw new Error("Failed to parse Poke Lounge audio manifest");
      }

      return manifest;
    },
  );

  return manifestPromise;
}

async function playWithWebAudio(
  context: AudioContext,
  item: PokeLoungeSfxManifestItem,
  requestedVolume: number | undefined,
  generation: number,
): Promise<boolean> {
  if (context.state === "suspended") {
    await context.resume().catch(() => undefined);
  }

  if (context.state === "suspended") {
    return false;
  }

  const buffer = await loadAudioBuffer(item);
  if (!buffer || generation !== playbackGeneration) {
    return false;
  }

  const source = context.createBufferSource();
  const gain = context.createGain();
  gain.gain.value = clampVolume(requestedVolume ?? item.defaultVolume);
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(getMasterGain(context) ?? context.destination);
  activeBufferSources.add(source);
  source.onended = () => {
    activeBufferSources.delete(source);
    source.disconnect();
  };
  source.start();

  return true;
}

function loadAudioBuffer(item: PokeLoungeAudioManifestItem): Promise<AudioBuffer | null> {
  const cached = bufferPromises.get(item.id);
  if (cached) {
    return cached;
  }

  const preloadedBytes = preloadedAudioBytes.get(item.id);
  const promise = preloadedBytes
    ? decodeAudioData(preloadedBytes.slice(0)).catch(() => null)
    : fetch(item.src, { cache: "force-cache" })
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

function isActiveBgmPlaying(): boolean {
  if (!activeBgm) {
    return false;
  }

  if (activeBgm.source) {
    return audioContext?.state === "running";
  }

  return activeBgm.audio ? !activeBgm.audio.paused : false;
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
  requestedVolume: number | undefined,
  generation: number,
): Promise<void> {
  if (generation !== playbackGeneration) {
    return;
  }

  const audio = createHtmlAudioElement(item);
  setHtmlAudioElementVolume(audio, requestedVolume ?? item.defaultVolume);
  audio.currentTime = 0;
  activeHtmlAudioElements.add(audio);

  try {
    await audio.play();
    audio.addEventListener(
      "ended",
      () => {
        activeHtmlAudioElements.delete(audio);
      },
      { once: true },
    );
  } catch (error) {
    activeHtmlAudioElements.delete(audio);
    throw error;
  }
}

function getHtmlAudioElement(item: PokeLoungeAudioManifestItem): HTMLAudioElement {
  const cached = htmlAudioElements.get(item.id);
  if (cached) {
    return cached;
  }

  const audio = createHtmlAudioElement(item);
  htmlAudioElements.set(item.id, audio);

  return audio;
}

function createHtmlAudioElement(item: PokeLoungeAudioManifestItem): HTMLAudioElement {
  const audio = new Audio(getPreloadedAudioSource(item));
  audio.preload = "auto";
  audio.setAttribute("playsinline", "");
  setHtmlAudioElementVolume(audio, item.defaultVolume);

  return audio;
}

function startSilentAudioUnlock(context: AudioContext): void {
  if (unlockedAudioContexts.has(context)) {
    return;
  }

  try {
    const source = context.createBufferSource();
    source.buffer = context.createBuffer(1, 1, context.sampleRate);
    source.connect(context.destination);
    source.onended = () => source.disconnect();
    source.start();
  } catch {
    // 일부 모바일 브라우저는 사용자 제스처 밖의 unlock source 생성을 거부한다.
  }
}

function getPreloadedAudioSource(item: PokeLoungeAudioManifestItem): string {
  const cachedObjectUrl = audioObjectUrls.get(item.id);
  if (cachedObjectUrl) {
    return cachedObjectUrl;
  }

  const bytes = preloadedAudioBytes.get(item.id);
  if (
    !bytes ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function" ||
    typeof Blob === "undefined"
  ) {
    return item.src;
  }

  const objectUrl = URL.createObjectURL(
    new Blob([bytes], { type: item.src.endsWith(".ogg") ? "audio/ogg" : "audio/mpeg" }),
  );
  audioObjectUrls.set(item.id, objectUrl);

  return objectUrl;
}

function clearAudioObjectUrls(): void {
  if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    for (const objectUrl of audioObjectUrls.values()) {
      URL.revokeObjectURL(objectUrl);
    }
  }
  audioObjectUrls.clear();
}

function stopHtmlAudioElement(audio: HTMLAudioElement): void {
  audio.pause();
  try {
    audio.currentTime = 0;
  } catch {
    // 메타데이터가 준비되지 않은 오디오는 재생 위치를 변경할 수 없다.
  }
}

function setHtmlAudioElementVolume(audio: HTMLAudioElement, baseVolume: number): void {
  const gain = getHtmlAudioGain(audio);

  if (gain) {
    gain.gain.value = clampVolume(baseVolume);
    audio.volume = 1;
    return;
  }

  audio.volume = resolveVolume(baseVolume, 1);
}

function getHtmlAudioGain(audio: HTMLAudioElement): GainNode | null {
  const cached = htmlAudioGains.get(audio);
  if (cached) {
    return cached;
  }

  const context = getAudioContext();
  const gain = getMasterGain(context);
  if (!context || !gain) {
    return null;
  }

  try {
    const audioGain = context.createGain();
    context.createMediaElementSource(audio).connect(audioGain);
    audioGain.connect(gain);
    htmlAudioGains.set(audio, audioGain);

    return audioGain;
  } catch {
    return null;
  }
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

function getMasterGain(context = getAudioContext()): GainNode | null {
  if (!context) {
    return null;
  }

  if (!masterGain) {
    masterGain = context.createGain();
    masterGain.gain.value = masterVolume;
    masterGain.connect(context.destination);
  }

  return masterGain;
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

function createPokeLoungeAudioPreloadCacheKey(id: PokeLoungeAudioItemId): string {
  return `poke-lounge-audio-${id}`;
}

function isPokeLoungeSfxManifestItem(value: unknown): value is PokeLoungeSfxManifestItem {
  return isPokeLoungeAudioManifestItem(value) && POKE_LOUNGE_SFX_IDS.some(id => id === value.id);
}

function isPokeLoungeBgmManifestItem(value: unknown): value is PokeLoungeBgmManifestItem {
  return isPokeLoungeAudioManifestItem(value) && POKE_LOUNGE_BGM_IDS.some(id => id === value.id);
}

function isPokeLoungeAudioManifestItem(value: unknown): value is PokeLoungeAudioManifestItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.src === "string" &&
    Number.isFinite(value.durationMs) &&
    Number.isFinite(value.sizeBytes) &&
    Number.isFinite(value.defaultVolume) &&
    isPokeLoungeAudioSource(value.source)
  );
}

function isPokeLoungeAudioSource(value: unknown): value is PokeLoungeAudioSource {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    typeof value.creator === "string" &&
    value.license === "CC0-1.0" &&
    typeof value.sourceUrl === "string" &&
    typeof value.sourceFile === "string"
  );
}

function hasExactAudioItemIds(
  items: readonly PokeLoungeAudioManifestItem[],
  expectedIds: readonly PokeLoungeAudioItemId[],
): boolean {
  const itemIds = new Set(items.map(item => item.id));

  return (
    itemIds.size === expectedIds.length && expectedIds.every(expectedId => itemIds.has(expectedId))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
