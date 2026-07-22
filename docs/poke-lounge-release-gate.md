# Poke Lounge Release Gate

**Audit date:** 2026-07-11
**Audit evidence:** `.superpowers/sdd/ip-audit-report.md` (`DONE_WITH_CONCERNS`)
**Scope:** technical provenance audit based on local evidence only; not legal advice.

## Release Decision

Provenance status: UNRESOLVED

The `/[locale]/game/poke-lounge` route has 61 public asset records without verified distribution rights. This is an explicit release risk, but it no longer blocks the repository's default Vercel build.

`pnpm check:poke-lounge-provenance` still fails because 61 non-audio manifest rows remain `"rightsStatus": "blocked"`; the nine audio rows have reviewed CC0 source records. Set `POKE_LOUNGE_PROVENANCE_STRICT=1` only in an environment where unresolved provenance should block the build.

Persistence, Socket recovery, deterministic server competition, verified-only ranking, migration, CI, test, or documentation completion does not change this decision. The technical implementation is recorded in [Poke Lounge Hardening Report](./poke-lounge-hardening-report.md), but it does not establish ownership, permission, license compatibility, trademark clearance, or any other legal conclusion. A human owner and appropriate legal reviewer must review the unresolved items and record the release decision.

## Release owner sign-off

| Release owner | Final release decision | Signed/approved at |
| ------------- | ---------------------- | ------------------ |
| Unassigned    | Risk not resolved      | Unsigned           |

No legal clearance or signed approval is recorded. Default deployment continuing must not be interpreted as asset-rights approval.

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

- Pokémon sprites: every file below `apps/web/public/assets/pokemon/front/`, `apps/web/public/assets/pokemon/back/`, `apps/web/public/assets/pokemon/battle/`, `apps/web/public/assets/pokemon/cataloged/`, and `apps/web/public/assets/pokemon/sheets/`.
- Archive-named visuals and character atlas: every file below `apps/web/public/assets/poke-lounge/dump/`, `apps/web/public/assets/poke-lounge/player/`, `apps/web/public/assets/poke-lounge/screens/`, and `apps/web/public/assets/poke-lounge/textures/`.
- Map material: `apps/web/public/assets/pokemmo-reference/tilesets/tuxmon-sample-32px-extruded.png` and `apps/web/public/maps/pokemmo-reference/town.json`.
- Game and extracted data: every file below `apps/web/public/assets/poke-lounge/extraction/` and `apps/web/public/game-data/`.

`scripts/poke-lounge/extract-rom-game-data.py` provides ROM-extraction evidence for the extracted records and four sprite sheets. The generated sheets also match all 30 unique legacy front/back frames byte-for-byte. This confirms technical origin but does not provide distribution rights. The audit found no local license, permission, or attribution proof for the sprite, map, texture, atlas, or gameplay-data assets.

## Approval table

| Required approval                                     | Evidence required                                                  | Current state |
| ----------------------------------------------------- | ------------------------------------------------------------------ | ------------- |
| Pokémon name/marks and gameplay data                  | Owner/legal distribution decision                                  | Pending       |
| Runtime audio                                         | CC0 source, original filename, hash, and reviewer record            | Completed     |
| ROM-derived extracted data                            | Written authorization or replacement/removal record                | Pending       |
| Sprites, textures, atlas, PokeMMO/Tuxmon map material | Original source, license/permission, required attribution          | Pending       |
| VSCoke Poke Lounge ported code                        | Owner/contributor authorization and outbound code-license decision | Pending       |

Only a release owner may set a manifest row to `"rightsStatus": "approved"`; the row must then have a matching SHA-256, nonempty source, reviewer, approval timestamp, and any required attribution.
