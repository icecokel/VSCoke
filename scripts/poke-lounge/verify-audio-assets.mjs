import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const manifestPath = path.join(
  repoRoot,
  "apps/web/public/assets/poke-lounge/audio/audio-manifest.json",
);

const expectedIds = new Set([
  "button-confirm",
  "button-cancel",
  "battle-start",
  "battle-hit",
  "battle-transition",
  "pokemon-faint",
]);

function fail(message) {
  console.error(`Audio asset verification failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(manifestPath)) {
  fail(`missing manifest at ${path.relative(repoRoot, manifestPath)}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

if (!manifest || !Array.isArray(manifest.sfx)) {
  fail("manifest.sfx must be an array");
}

const ids = new Set(manifest.sfx.map(item => item.id));

for (const expectedId of expectedIds) {
  if (!ids.has(expectedId)) {
    fail(`missing SFX id ${expectedId}`);
  }
}

for (const item of manifest.sfx) {
  if (!expectedIds.has(item.id)) {
    fail(`unexpected SFX id ${item.id}`);
  }

  if (typeof item.src !== "string" || !item.src.endsWith(".mp3")) {
    fail(`${item.id} must point to an MP3 source`);
  }

  if (typeof item.durationMs !== "number" || item.durationMs <= 0) {
    fail(`${item.id} must include a positive durationMs`);
  }

  if (typeof item.sizeBytes !== "number" || item.sizeBytes <= 0 || item.sizeBytes > 160_000) {
    fail(`${item.id} must include a valid lightweight sizeBytes`);
  }

  if (typeof item.defaultVolume !== "number" || item.defaultVolume <= 0 || item.defaultVolume > 1) {
    fail(`${item.id} must include defaultVolume in the 0..1 range`);
  }

  const assetPath = path.join(repoRoot, "apps/web/public", item.src);
  if (!assetPath.startsWith(path.join(repoRoot, "apps/web/public"))) {
    fail(`${item.id} src resolves outside public directory`);
  }

  if (!fs.existsSync(assetPath)) {
    fail(`${item.id} missing asset at ${item.src}`);
  }

  const stats = fs.statSync(assetPath);
  if (stats.size !== item.sizeBytes) {
    fail(`${item.id} manifest sizeBytes does not match file size`);
  }

  const header = fs.readFileSync(assetPath, { start: 0, end: 2 });
  const isMp3 = header.toString("latin1").startsWith("ID3") || header[0] === 0xff;
  if (!isMp3) {
    fail(`${item.id} does not look like an MP3 file`);
  }
}

const totalBytes = manifest.sfx.reduce((sum, item) => sum + item.sizeBytes, 0);
if (totalBytes > 500_000) {
  fail(`total SFX payload ${totalBytes} exceeds 500000 bytes`);
}

console.log(`Verified ${manifest.sfx.length} Poke Lounge audio assets (${totalBytes} bytes).`);
