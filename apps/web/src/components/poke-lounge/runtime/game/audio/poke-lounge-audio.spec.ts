import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { getPokeLoungeAudioPreloadAssets, parsePokeLoungeAudioManifest } from "./poke-lounge-audio";

const webRoot = fileURLToPath(new URL("../../../../../../", import.meta.url));
const manifestPath = path.join(webRoot, "public/assets/poke-lounge/audio/audio-manifest.json");

test("부트 오디오 프리로드는 매니페스트의 모든 음원을 고유한 캐시 키로 제공한다", () => {
  const manifest = parsePokeLoungeAudioManifest(JSON.parse(fs.readFileSync(manifestPath, "utf8")));

  assert.ok(manifest);
  const preloadAssets = getPokeLoungeAudioPreloadAssets(manifest);

  assert.equal(preloadAssets.length, manifest.sfx.length + manifest.bgm.length);
  assert.equal(new Set(preloadAssets.map(asset => asset.id)).size, preloadAssets.length);
  assert.equal(new Set(preloadAssets.map(asset => asset.cacheKey)).size, preloadAssets.length);
  assert.ok(preloadAssets.every(asset => asset.src.startsWith("/assets/poke-lounge/audio/")));
});

test("필수 음원이 빠진 오디오 매니페스트는 부트 완료 대상으로 인정하지 않는다", () => {
  const manifest = parsePokeLoungeAudioManifest(JSON.parse(fs.readFileSync(manifestPath, "utf8")));

  assert.ok(manifest);
  assert.equal(
    parsePokeLoungeAudioManifest({
      ...manifest,
      sfx: manifest.sfx.slice(1),
    }),
    null,
  );
});
