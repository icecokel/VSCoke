# Poke Lounge Release Gate

**Audit date:** 2026-07-11
**Audit evidence:** `.superpowers/sdd/ip-audit-report.md` (`DONE_WITH_CONCERNS`)
**Scope:** technical provenance audit based on local evidence only; not legal advice.

## Release Decision

Status: BLOCKED

The `/[locale]/game/poke-lounge` route and every Poke Lounge public asset remain ineligible for public deployment. A release owner may change this status only after `pnpm check:poke-lounge-provenance` passes and signs the approval table below.

The checker intentionally fails now because 57 non-audio manifest rows remain `"rightsStatus": "blocked"`. The nine audio rows have reviewed CC0 source records. Do not mask the remaining failure with `|| true` in release CI.

Persistence, Socket recovery, deterministic server competition, verified-only ranking, migration, CI, test, or documentation completion does not change this decision. The technical implementation is recorded in [Poke Lounge Hardening Report](./poke-lounge-hardening-report.md), but it does not establish ownership, permission, license compatibility, trademark clearance, or any other legal conclusion. A human owner and appropriate legal reviewer must review the unresolved items and record the release decision.

## Release owner sign-off

| Release owner | Final release decision | Signed/approved at |
| ------------- | ---------------------- | ------------------ |
| Unassigned    | BLOCKED                | Unsigned           |

No release owner, approval, or signed date is recorded. The table must remain unsigned until the strict provenance command passes with approved rows and a human release owner makes the final decision.

## Replaced CC0 audio

- `apps/web/public/assets/poke-lounge/audio/sfx/button-confirm.mp3`
- `apps/web/public/assets/poke-lounge/audio/sfx/button-cancel.mp3`
- `apps/web/public/assets/poke-lounge/audio/sfx/battle-transition.mp3`
- `apps/web/public/assets/poke-lounge/audio/sfx/battle-start.mp3`
- `apps/web/public/assets/poke-lounge/audio/sfx/battle-hit.mp3`
- `apps/web/public/assets/poke-lounge/audio/sfx/pokemon-faint.mp3`
- `apps/web/public/assets/poke-lounge/audio/bgm/field-day.mp3`
- `apps/web/public/assets/poke-lounge/audio/bgm/wild-battle.mp3`

All files above were replaced on 2026-07-12. Field and battle music use OpenGameArt CC0 tracks; interface and battle effects use Kenney CC0 packs. The current audio manifest contains creator, license, source page, and original filename metadata, and the old ROM/SDAT renderer and cue configuration were removed. See [Poke Lounge Audio Sources](./poke-lounge-audio-sources.md).

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
| Runtime audio                                         | CC0 source, original filename, hash, and reviewer record            | Completed     |
| ROM-derived extracted data                            | Written authorization or replacement/removal record                | Pending       |
| Sprites, textures, atlas, PokeMMO/Tuxmon map material | Original source, license/permission, required attribution          | Pending       |
| VSCoke Poke Lounge ported code                        | Owner/contributor authorization and outbound code-license decision | Pending       |

Only a release owner may set a manifest row to `"rightsStatus": "approved"`; the row must then have a matching SHA-256, nonempty source, reviewer, approval timestamp, and any required attribution.
