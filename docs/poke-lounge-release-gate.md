# Poke Lounge Release Gate

**Audit date:** 2026-07-10
**Audit evidence:** `.superpowers/sdd/ip-audit-report.md` (`DONE_WITH_CONCERNS`)
**Scope:** technical provenance audit based on local evidence only; not legal advice.

## Release Decision

Status: BLOCKED

The `/[locale]/game/poke-lounge` route and every Poke Lounge public asset remain ineligible for public deployment. A release owner may change this status only after `pnpm check:poke-lounge-provenance` passes and signs the approval table below.

The checker intentionally fails now because every audited manifest row is `"rightsStatus": "blocked"`. Do not mask that failure with `|| true` in release CI.

## Release owner sign-off

| Release owner | Final release decision | Signed/approved at |
| ------------- | ---------------------- | ------------------ |
| Unassigned    | BLOCKED                | Unsigned           |

No release owner, approval, or signed date is recorded. The table must remain unsigned until the strict provenance command passes with approved rows and a human release owner makes the final decision.

## Confirmed ROM-derived MP3 files

- `apps/web/public/assets/poke-lounge/audio/sfx/button-confirm.mp3`
- `apps/web/public/assets/poke-lounge/audio/sfx/button-cancel.mp3`
- `apps/web/public/assets/poke-lounge/audio/sfx/battle-transition.mp3`
- `apps/web/public/assets/poke-lounge/audio/sfx/battle-start.mp3`
- `apps/web/public/assets/poke-lounge/audio/sfx/battle-hit.mp3`
- `apps/web/public/assets/poke-lounge/audio/sfx/pokemon-faint.mp3`
- `apps/web/public/assets/poke-lounge/audio/bgm/field-day.mp3`
- `apps/web/public/assets/poke-lounge/audio/bgm/wild-battle.mp3`

Evidence: `scripts/poke-lounge/audio-cues.json` names `data/roms/포켓몬스터 하트골드(K).nds`; `scripts/poke-lounge/render-audio-cues.py` reads the NDS ROM/SDAT and generates the public MP3 files. `apps/web/public/assets/poke-lounge/audio/audio-manifest.json` retains the SDAT sequence identifiers.

## Unknown or unresolved public assets

All entries below are blocked. The full per-file inventory and SHA-256 values are in `docs/poke-lounge-asset-provenance.json`.

- Pokémon sprites: every file below `apps/web/public/assets/pokemon/front/`, `apps/web/public/assets/pokemon/back/`, `apps/web/public/assets/pokemon/battle/`, and `apps/web/public/assets/pokemon/cataloged/`.
- Archive-named visuals and character atlas: every file below `apps/web/public/assets/poke-lounge/dump/`, `apps/web/public/assets/poke-lounge/player/`, `apps/web/public/assets/poke-lounge/screens/`, and `apps/web/public/assets/poke-lounge/textures/`.
- Map material: `apps/web/public/assets/pokemmo-reference/tilesets/tuxmon-sample-32px-extruded.png` and `apps/web/public/maps/pokemmo-reference/town.json`.
- Game and extracted data: every file below `apps/web/public/assets/poke-lounge/extraction/` and `apps/web/public/game-data/`.

`scripts/poke-lounge/extract-rom-game-data.py` provides ROM-extraction evidence for the extracted records, but no distribution-rights record exists. The audit found no local license, permission, or attribution proof for the remaining sprite, map, texture, atlas, or gameplay-data assets.

## Approval table

| Required approval                                     | Evidence required                                                  | Current state |
| ----------------------------------------------------- | ------------------------------------------------------------------ | ------------- |
| Pokémon name/marks and gameplay data                  | Owner/legal distribution decision                                  | Pending       |
| ROM-derived audio and extracted data                  | Written authorization or replacement/removal record                | Pending       |
| Sprites, textures, atlas, PokeMMO/Tuxmon map material | Original source, license/permission, required attribution          | Pending       |
| VSCoke Poke Lounge ported code                        | Owner/contributor authorization and outbound code-license decision | Pending       |

Only a release owner may set a manifest row to `"rightsStatus": "approved"`; the row must then have a matching SHA-256, nonempty source, reviewer, approval timestamp, and any required attribution.
