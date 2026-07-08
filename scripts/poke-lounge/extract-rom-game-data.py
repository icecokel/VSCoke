#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

try:
    from ndspy.narc import NARC
    from ndspy.rom import NintendoDSRom
except ImportError as error:
    raise SystemExit(
        "Missing Python package 'ndspy'. Install it with: python3 -m pip install --user ndspy"
    ) from error


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ROM_PATH = REPO_ROOT / "data/roms/포켓몬스터 하트골드(K).nds"
DEFAULT_POKEMON_DATA_PATH = REPO_ROOT / "apps/web/public/game-data/pokemon-data.json"
DEFAULT_LEVEL_UP_MOVE_TABLE_PATH = (
    REPO_ROOT / "apps/web/public/game-data/level-up-move-table.json"
)

PERSONAL_NARC_PATH = "pbr/personal.narc"
MOVE_NARC_PATH = "pbr/waza_tbl.narc"
LEARNSET_NARC_PATH = "a/0/3/3"
EVOLUTION_NARC_PATH = "a/0/3/4"

GEN4_TYPE_NAMES = [
    "노말",
    "격투",
    "비행",
    "독",
    "땅",
    "바위",
    "벌레",
    "고스트",
    "강철",
    "???",
    "불꽃",
    "물",
    "풀",
    "전기",
    "에스퍼",
    "얼음",
    "드래곤",
    "악",
]

GEN4_MOVE_CATEGORY_NAMES = {
    0: "physical",
    1: "special",
    2: "status",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract Poke Lounge game data from a local NDS ROM.")
    parser.add_argument("--rom", type=Path, default=DEFAULT_ROM_PATH)
    parser.add_argument("--pokemon-data", type=Path, default=DEFAULT_POKEMON_DATA_PATH)
    parser.add_argument("--level-up-table", type=Path, default=DEFAULT_LEVEL_UP_MOVE_TABLE_PATH)
    args = parser.parse_args()

    rom_path = resolve_repo_path(args.rom)
    if not rom_path.exists():
        raise FileNotFoundError(f"ROM file is missing: {rom_path}")

    rom_bytes = rom_path.read_bytes()
    rom_sha1 = hashlib.sha1(rom_bytes).hexdigest()
    rom = NintendoDSRom(rom_bytes)

    personal = NARC(bytes(rom.getFileByName(PERSONAL_NARC_PATH)))
    moves = NARC(bytes(rom.getFileByName(MOVE_NARC_PATH)))
    learnsets = parse_learnsets(NARC(bytes(rom.getFileByName(LEARNSET_NARC_PATH))))
    evolutions = parse_evolutions(NARC(bytes(rom.getFileByName(EVOLUTION_NARC_PATH))))
    move_records = parse_move_records(moves)
    pokemon_records = parse_pokemon_records(personal, learnsets, evolutions)

    source = {
        "romPath": str(rom_path.relative_to(REPO_ROOT)),
        "romSha1": rom_sha1,
        "personalPath": PERSONAL_NARC_PATH,
        "movePath": MOVE_NARC_PATH,
        "learnsetPath": LEARNSET_NARC_PATH,
        "evolutionPath": EVOLUTION_NARC_PATH,
    }

    pokemon_data = {
        "version": 1,
        "source": source,
        "typeNames": GEN4_TYPE_NAMES,
        "moveCategories": GEN4_MOVE_CATEGORY_NAMES,
        "stats": {
            "pokemonRecords": len(pokemon_records),
            "moveRecords": len(move_records),
            "learnsetSpecies": sum(1 for record in pokemon_records if record["levelUpMoves"]),
        },
        "species": {str(record["speciesId"]): record for record in pokemon_records},
        "moves": {str(record["id"]): record for record in move_records},
    }
    level_up_move_table = {
        "version": 1,
        "source": source,
        "species": {
            str(record["speciesId"]): record["levelUpMoves"]
            for record in pokemon_records
            if record["levelUpMoves"]
        },
    }

    write_json(resolve_repo_path(args.pokemon_data), pokemon_data)
    write_json(resolve_repo_path(args.level_up_table), level_up_move_table)

    print(
        "Extracted "
        f"{len(pokemon_records)} Pokemon records, "
        f"{len(move_records)} move records, "
        f"{len(level_up_move_table['species'])} level-up tables."
    )


def parse_pokemon_records(
    personal: NARC,
    learnsets: dict[int, list[dict[str, int]]],
    evolutions: dict[int, list[dict[str, int]]],
) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []

    for species_id, file_data in enumerate(personal.files):
        if species_id == 0:
            continue

        data = bytes(file_data)
        if len(data) < 44:
            raise ValueError(f"Personal record {species_id} is too short: {len(data)} bytes")

        primary_type = data[6]
        secondary_type = data[7]
        type_ids = unique_type_ids([primary_type, secondary_type])

        records.append(
            {
                "speciesId": species_id,
                "nationalDexId": species_id if 1 <= species_id <= 493 else None,
                "baseStats": {
                    "hp": data[0],
                    "attack": data[1],
                    "defense": data[2],
                    "speed": data[3],
                    "specialAttack": data[4],
                    "specialDefense": data[5],
                },
                "types": {
                    "primary": primary_type,
                    "secondary": secondary_type if secondary_type != primary_type else None,
                    "ids": type_ids,
                    "names": [GEN4_TYPE_NAMES[type_id] for type_id in type_ids],
                },
                "catchRate": data[8],
                "baseExpYield": data[9],
                "evYieldRaw": read_u16le(data, 10),
                "heldItemsRaw": {
                    "item1": read_u16le(data, 12),
                    "item2": read_u16le(data, 14),
                },
                "genderRatio": data[16],
                "eggCycles": data[17],
                "baseFriendship": data[18],
                "growthRate": data[19],
                "eggGroups": {
                    "primary": data[20],
                    "secondary": data[21],
                },
                "abilities": {
                    "primary": data[22],
                    "secondary": data[23] or None,
                },
                "safariFleeRate": data[24],
                "colorFlipRaw": data[25],
                "levelUpMoves": learnsets.get(species_id, []),
                "evolutions": evolutions.get(species_id, []),
            }
        )

    return records


def parse_move_records(moves: NARC) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []

    for move_id, file_data in enumerate(moves.files):
        data = bytes(file_data)
        if len(data) < 7:
            raise ValueError(f"Move record {move_id} is too short: {len(data)} bytes")

        type_id = data[4]
        category_id = data[2]
        records.append(
            {
                "id": move_id,
                "effectCode": read_u16le(data, 0),
                "category": GEN4_MOVE_CATEGORY_NAMES.get(category_id, "status"),
                "categoryId": category_id,
                "power": data[3],
                "typeId": type_id,
                "typeName": GEN4_TYPE_NAMES[type_id] if type_id < len(GEN4_TYPE_NAMES) else f"type-{type_id}",
                "accuracy": data[5],
                "pp": data[6],
            }
        )

    return records


def parse_learnsets(learnset_narc: NARC) -> dict[int, list[dict[str, int]]]:
    learnsets: dict[int, list[dict[str, int]]] = {}

    for species_id, file_data in enumerate(learnset_narc.files):
        rows: list[dict[str, int]] = []
        data = bytes(file_data)

        for offset in range(0, len(data) - 1, 2):
            value = read_u16le(data, offset)
            if value == 0xFFFF:
                break
            if value == 0:
                continue

            move_id = value & 0x1FF
            level = value >> 9
            if move_id > 0 and level > 0:
                rows.append({"level": level, "moveId": move_id})

        learnsets[species_id] = rows

    return learnsets


def parse_evolutions(evolution_narc: NARC) -> dict[int, list[dict[str, int]]]:
    evolutions: dict[int, list[dict[str, int]]] = {}

    for species_id, file_data in enumerate(evolution_narc.files):
        rows: list[dict[str, int]] = []
        data = bytes(file_data)

        for offset in range(0, len(data) - 5, 6):
            method = read_u16le(data, offset)
            parameter = read_u16le(data, offset + 2)
            target_species_id = read_u16le(data, offset + 4)

            if method == 0 and parameter == 0 and target_species_id == 0:
                continue

            rows.append(
                {
                    "method": method,
                    "parameter": parameter,
                    "targetSpeciesId": target_species_id,
                }
            )

        evolutions[species_id] = rows

    return evolutions


def read_u16le(data: bytes, offset: int) -> int:
    return int.from_bytes(data[offset : offset + 2], "little")


def unique_type_ids(type_ids: list[int]) -> list[int]:
    unique: list[int] = []
    for type_id in type_ids:
        if type_id not in unique:
            unique.append(type_id)
    return unique


def resolve_repo_path(path: Path) -> Path:
    return path if path.is_absolute() else REPO_ROOT / path


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
