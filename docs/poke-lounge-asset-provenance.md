# Poke Lounge Asset Provenance

## Status

**Public release is blocked.** Poke Lounge must not be publicly deployed or distributed until the human owner records a rights decision for the Pokémon name/marks, ROM-derived material, game data, and third-party-labelled map material, and every shipped asset has a reviewed provenance record.

This document is a technical provenance audit based on local repository evidence. It is not legal advice and does not clear any asset for use or distribution.

The completed server-authority and durability work in [Poke Lounge Hardening Report](./poke-lounge-hardening-report.md) has no effect on this status. Only documented owner decisions, appropriate legal review, approved per-file evidence, and release-owner sign-off can change the release gate.

## Evidence status

- **Confirmed ROM-derived:** local scripts/manifests directly identify a HeartGold NDS ROM or its SDAT data as input.
- **Unknown provenance:** no local license, permission, attribution, or authorship evidence was found for the shipped file.
- **Owner decision required:** technical evidence is insufficient to decide distribution rights; the human owner must authorize, replace, or remove the item.

## Inventory

| Area                                      | Exact paths                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Evidence status                                                      | Technical evidence and required decision                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application/API code                      | `apps/web/src/components/poke-lounge/`, `apps/web/src/app/[locale]/game/poke-lounge/page.tsx`, `apps/api/src/poke-lounge/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Owner decision required                                              | Git commit `b1c9fe1889f9be3b40cc65e5704209ed61a49288` records the VSCoke port. Local history has `icecokel` identities, and `docs/superpowers/plans/2026-07-07-poke-lounge-remaining-work-plan.md` points to `/Users/smlee/Documents/poke-lounge`. There is no repository/root code license, attribution header, or documented transfer authorization. Confirm ownership/contributor rights and choose an outbound code-license policy. |
| Pokémon names and ROM game-data extractor | `scripts/poke-lounge/extract-rom-game-data.py`, `apps/web/src/components/poke-lounge/runtime/starter-selection.ts`, `apps/web/src/components/poke-lounge/runtime/game/battle/`                                                                                                                                                                                                                                                                                                                                                                                                                            | Confirmed ROM-extraction evidence; owner decision required           | The extractor parses NARC data into personal, move, growth, and evolution records. The runtime and route use Pokémon-specific concepts and names. Decide whether the marks and the gameplay/data representation may be publicly used.                                                                                                                                                                                                   |
| Public extracted records                  | `apps/web/public/assets/poke-lounge/extraction/personal-data.json`, `apps/web/public/assets/poke-lounge/extraction/refined-battle-records.json`, `apps/web/public/assets/poke-lounge/extraction/growth-table.json`                                                                                                                                                                                                                                                                                                                                                                                        | Confirmed ROM-derived                                                | The extraction script and Poke Lounge plans establish ROM-record input; the public JSON files contain no license, permission, or attribution record. Authorize, replace, or remove before release.                                                                                                                                                                                                                                      |
| Public gameplay data                      | `apps/web/public/game-data/pokemon-data.json`, `apps/web/public/game-data/level-up-move-table.json`, `apps/web/public/game-data/wild-encounter-tables.json`, `apps/web/public/game-data/wild-battle-move-sets.json`, `apps/web/public/game-data/battle-pokemon-assets.json`, `apps/web/public/game-data/battle-screen-assets.json`, `apps/web/public/game-data/bootstrap.json`                                                                                                                                                                                                                            | Confirmed ROM-extraction evidence; owner decision required           | `apps/web/src/components/poke-lounge/runtime/game/data/game-data-json.ts` loads these files. They have no shipped provenance or license record.                                                                                                                                                                                                                                                                                         |
| Pokémon sprites                           | `apps/web/public/assets/pokemon/front/`, `apps/web/public/assets/pokemon/back/`, `apps/web/public/assets/pokemon/battle/`, `apps/web/public/assets/pokemon/cataloged/`                                                                                                                                                                                                                                                                                                                                                                                                                                    | Unknown provenance; owner decision required                          | 36 public PNGs were added with the port commit. No adjacent license, attribution, or permission evidence exists. Replace or obtain a documented rights basis.                                                                                                                                                                                                                                                                           |
| Archive-named textures/screens            | `apps/web/public/assets/poke-lounge/dump/pbr_winframe.narc/file_0000_pal_0024.png`, `apps/web/public/assets/poke-lounge/screens/pbr_b_plist_gra.narc/screen_0010_gfx_0022_pal_0023.png`, `apps/web/public/assets/poke-lounge/textures/a_0_7_0_0093/tmfl04_door1.png`, `apps/web/public/assets/poke-lounge/textures/a_0_8_1_0039/gentleman_5.png`, `apps/web/public/assets/poke-lounge/textures/a_0_8_1_0132/shopm1_5.png`, `apps/web/public/assets/poke-lounge/textures/a_0_8_1_0133/pcwoman1_5.png`, `apps/web/public/assets/poke-lounge/textures/a_0_8_1_0184/mania_5.png`                              | Unknown provenance, high ROM-origin concern; owner decision required | Archive/NARC-style names and the documented extraction workflow are evidence of likely origin, but no released file carries a rights record. Do not treat a renamed public path as clearance.                                                                                                                                                                                                                                           |
| Character and map assets                  | `apps/web/public/assets/poke-lounge/player/hero-atlas.png`, `apps/web/public/assets/poke-lounge/player/hero-atlas.json`, `apps/web/public/assets/pokemmo-reference/tilesets/tuxmon-sample-32px-extruded.png`, `apps/web/public/maps/pokemmo-reference/town.json`                                                                                                                                                                                                                                                                                                                                          | Unknown provenance; owner decision required                          | No local author, source, license, or attribution proof was found. The `pokemmo-reference` and `tuxmon` names are not a license grant. Identify the original source and required attribution or replace the files.                                                                                                                                                                                                                       |
| Public audio                              | `apps/web/public/assets/poke-lounge/audio/audio-manifest.json`, `apps/web/public/assets/poke-lounge/audio/sfx/*.mp3`, `apps/web/public/assets/poke-lounge/audio/bgm/*.mp3`                                                                                                                                                                                                                                                                                                                                                                                                                               | Replaced with reviewed CC0 sources                                   | The eight runtime audio files now come from OpenGameArt CC0 music and Kenney CC0 sound packs. `audio-manifest.json` records title, creator, license, source page, and original filename. Source mapping and local Kenney license evidence are in [Poke Lounge Audio Sources](./poke-lounge-audio-sources.md). The previous ROM/SDAT renderer and cue configuration were removed.                                                                                                                              |

## Current release control

- `private: true` in `package.json` and `apps/web/package.json`, ignored raw-ROM directories, and the absence of `apps/web/public/assets/rom-*` are not IP clearance.
- The historical sound-effects plan documents the removed ROM-derived workflow. It is retained as implementation history and is not a valid production regeneration path.
- Runtime source still contains ROM extraction path references in `apps/web/src/components/poke-lounge/runtime/rom-web-conversion.ts`, `apps/web/src/components/poke-lounge/runtime/ui-assets.ts`, and `apps/web/src/components/poke-lounge/runtime/map-sample.ts`. These references should be removed or documented when the underlying feature is removed or cleared.

## Machine-checkable release manifest

`docs/poke-lounge-asset-provenance.json` records all 66 audited public files with local SHA-256 values. The nine audio rows are approved from documented CC0 sources; the other 57 rows remain `blocked`. `pnpm check:poke-lounge-provenance` validates the public-file coverage, hashes, source record, approval fields, and attribution fields. Its current failure is intentional because unresolved non-audio assets still block release.

After the owner makes decisions, define `docs/poke-lounge-asset-provenance.schema.json` and validate the manifest against it. A minimum JSON Schema shape is:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["version", "assets"],
  "properties": {
    "version": { "const": 1 },
    "assets": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "path",
          "sha256",
          "category",
          "evidenceStatus",
          "source",
          "licenseOrPermission",
          "requiredAttribution",
          "ownerDecision",
          "reviewedBy",
          "reviewedAt"
        ],
        "properties": {
          "path": { "type": "string", "pattern": "^apps/web/public/" },
          "sha256": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
          "category": { "enum": ["code", "name_data", "image_texture_map", "audio"] },
          "evidenceStatus": {
            "enum": ["confirmed_rom_derived", "unknown_provenance", "owner_decision_required"]
          },
          "source": { "type": "string" },
          "licenseOrPermission": { "type": "string" },
          "requiredAttribution": { "type": "string" },
          "ownerDecision": { "enum": ["pending", "replace", "remove", "approved"] },
          "reviewedBy": { "type": ["string", "null"] },
          "reviewedAt": { "type": ["string", "null"], "format": "date-time" }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

Required validation rules:

1. `path` must resolve to one tracked public Poke Lounge file and `sha256` must match its bytes.
2. `category` must be one of `code`, `name_data`, `image_texture_map`, or `audio`.
3. `evidenceStatus` must be one of `confirmed_rom_derived`, `unknown_provenance`, or `owner_decision_required`.
4. `ownerDecision` may be `pending`, `replace`, `remove`, or `approved`; `approved` requires a non-empty `licenseOrPermission`, `reviewedBy`, and `reviewedAt`.
5. CI must fail public release when a Poke Lounge asset lacks a row, has a hash mismatch, remains `pending`, or requires attribution that is not emitted in the release notice.

## Source audit

Detailed local evidence and audit limits are recorded in `.superpowers/sdd/ip-audit-report.md`.
