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

try:
    from PIL import Image
except ImportError as error:
    raise SystemExit(
        "Missing Python package 'Pillow'. Install it with: python3 -m pip install --user Pillow"
    ) from error


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ROM_PATH = REPO_ROOT / "data/roms/포켓몬스터 하트골드(K).nds"
DEFAULT_POKEMON_DATA_PATH = REPO_ROOT / "apps/web/public/game-data/pokemon-data.json"
DEFAULT_LEVEL_UP_MOVE_TABLE_PATH = (
    REPO_ROOT / "apps/web/public/game-data/level-up-move-table.json"
)
DEFAULT_SPRITE_SHEET_DIRECTORY = REPO_ROOT / "apps/web/public/assets/pokemon/sheets"

PERSONAL_NARC_PATH = "pbr/personal.narc"
MOVE_NARC_PATH = "pbr/waza_tbl.narc"
LEARNSET_NARC_PATH = "a/0/3/3"
EVOLUTION_NARC_PATH = "a/0/3/4"
MESSAGE_NARC_PATH = "a/0/2/7"
POKEMON_NAME_MESSAGE_INDEX = 233
KOREAN_CHARACTER_MAP_PATH = "data/str2uni.bin"
BATTLE_SPRITE_NARC_PATH = "a/0/0/4"

EXPECTED_ROM_SHA1 = "5834fb3a2d751c48501d47d6a56898d7af6ccf9e"
EXPECTED_ARCHIVE_FILE_COUNTS = {
    PERSONAL_NARC_PATH: 501,
    MOVE_NARC_PATH: 471,
    LEARNSET_NARC_PATH: 508,
    EVOLUTION_NARC_PATH: 508,
    MESSAGE_NARC_PATH: 822,
    BATTLE_SPRITE_NARC_PATH: 2964,
}
EXPECTED_POKEMON_NAME_COUNT = 496
EXPECTED_KOREAN_CHARACTER_COUNT = 2416
EXPECTED_POKEMON_NAMES = {
    1: "이상해씨",
    25: "피카츄",
    29: "니드런♀",
    32: "니드런♂",
    152: "치코리타",
    233: "폴리곤2",
    474: "폴리곤Z",
    493: "아르세우스",
    494: "알",
    495: "불량알",
}

NATIONAL_DEX_SPECIES_COUNT = 493
KOREAN_CHARACTER_CODE_OFFSET = 0x401
MESSAGE_TABLE_KEY_MULTIPLIER = 0x2FD
MESSAGE_STRING_KEY_MULTIPLIER = 0x91BD3
MESSAGE_STRING_KEY_INCREMENT = 0x493D
GEN4_STANDARD_NAME_CHARACTERS = {
    0x123: "2",
    0x144: "Z",
    0x1BB: "♂",
    0x1BC: "♀",
}

BATTLE_SPRITE_MEMBERS_PER_SPECIES = 6
BATTLE_SPRITE_MEMBER_OFFSETS = {
    "back": {"fallback": 0, "default": 1},
    "front": {"fallback": 2, "default": 3},
}
BATTLE_SPRITE_PALETTE_MEMBER_OFFSET = 4
BATTLE_SPRITE_ENCRYPTION_MULTIPLIER = 0x41C64E6D
BATTLE_SPRITE_ENCRYPTION_INCREMENT = 0x6073
BATTLE_SPRITE_SOURCE_SIZE = (160, 80)
BATTLE_SPRITE_FRAME_SIZE = 80
BATTLE_SPRITE_SHEET_COLUMNS = 16
BATTLE_SPRITE_SHEET_SIZE = BATTLE_SPRITE_FRAME_SIZE * BATTLE_SPRITE_SHEET_COLUMNS
BATTLE_SPRITE_SHEET_RANGES = ((1, 256), (257, NATIONAL_DEX_SPECIES_COUNT))

EXTRA_FORM_SPECIES = {
    496: {
        "baseSpeciesId": 386,
        "formName": "어택폼",
        "name": "테오키스 어택폼",
    },
    497: {
        "baseSpeciesId": 386,
        "formName": "디펜스폼",
        "name": "테오키스 디펜스폼",
    },
    498: {
        "baseSpeciesId": 386,
        "formName": "스피드폼",
        "name": "테오키스 스피드폼",
    },
    499: {
        "baseSpeciesId": 413,
        "formName": "모래땅도롱",
        "name": "도롱마담 모래땅도롱",
    },
    500: {
        "baseSpeciesId": 413,
        "formName": "슈레도롱",
        "name": "도롱마담 슈레도롱",
    },
}

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
    parser = argparse.ArgumentParser(
        description="Extract Poke Lounge game data from a local NDS ROM."
    )
    parser.add_argument("--rom", type=Path, default=DEFAULT_ROM_PATH)
    parser.add_argument("--pokemon-data", type=Path, default=DEFAULT_POKEMON_DATA_PATH)
    parser.add_argument("--level-up-table", type=Path, default=DEFAULT_LEVEL_UP_MOVE_TABLE_PATH)
    parser.add_argument(
        "--sprite-sheet-directory",
        type=Path,
        default=DEFAULT_SPRITE_SHEET_DIRECTORY,
    )
    args = parser.parse_args()

    rom_path = resolve_repo_path(args.rom)
    if not rom_path.exists():
        raise FileNotFoundError(f"ROM file is missing: {rom_path}")

    rom_bytes = rom_path.read_bytes()
    rom_sha1 = hashlib.sha1(rom_bytes).hexdigest()
    validate_exact_value("ROM SHA-1", rom_sha1, EXPECTED_ROM_SHA1)
    rom = NintendoDSRom(rom_bytes)

    personal = NARC(bytes(rom.getFileByName(PERSONAL_NARC_PATH)))
    moves = NARC(bytes(rom.getFileByName(MOVE_NARC_PATH)))
    learnset_narc = NARC(bytes(rom.getFileByName(LEARNSET_NARC_PATH)))
    evolution_narc = NARC(bytes(rom.getFileByName(EVOLUTION_NARC_PATH)))
    messages = NARC(bytes(rom.getFileByName(MESSAGE_NARC_PATH)))
    battle_sprites = NARC(bytes(rom.getFileByName(BATTLE_SPRITE_NARC_PATH)))

    archives = {
        PERSONAL_NARC_PATH: personal,
        MOVE_NARC_PATH: moves,
        LEARNSET_NARC_PATH: learnset_narc,
        EVOLUTION_NARC_PATH: evolution_narc,
        MESSAGE_NARC_PATH: messages,
        BATTLE_SPRITE_NARC_PATH: battle_sprites,
    }
    for archive_path, archive in archives.items():
        validate_exact_value(
            f"{archive_path} member count",
            len(archive.files),
            EXPECTED_ARCHIVE_FILE_COUNTS[archive_path],
        )

    character_map_data = bytes(rom.getFileByName(KOREAN_CHARACTER_MAP_PATH))
    pokemon_names = parse_pokemon_names(
        bytes(messages.files[POKEMON_NAME_MESSAGE_INDEX]),
        character_map_data,
    )
    validate_pokemon_names(pokemon_names)

    learnsets = parse_learnsets(learnset_narc)
    evolutions = parse_evolutions(evolution_narc)
    move_records = parse_move_records(moves)
    pokemon_records = parse_pokemon_records(
        personal,
        learnsets,
        evolutions,
        pokemon_names,
    )
    sprite_sheets = build_battle_sprite_sheets(battle_sprites)

    source = {
        "romPath": str(rom_path.relative_to(REPO_ROOT)),
        "romSha1": rom_sha1,
        "personalPath": PERSONAL_NARC_PATH,
        "movePath": MOVE_NARC_PATH,
        "learnsetPath": LEARNSET_NARC_PATH,
        "evolutionPath": EVOLUTION_NARC_PATH,
        "messagePath": MESSAGE_NARC_PATH,
        "pokemonNameMessageIndex": POKEMON_NAME_MESSAGE_INDEX,
        "characterMapPath": KOREAN_CHARACTER_MAP_PATH,
        "battleSpritePath": BATTLE_SPRITE_NARC_PATH,
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
            "encounterableSpecies": sum(
                1 for record in pokemon_records if record["encounterable"]
            ),
            "spriteSpecies": NATIONAL_DEX_SPECIES_COUNT,
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
    write_sprite_sheets(resolve_repo_path(args.sprite_sheet_directory), sprite_sheets)

    print(
        "Extracted "
        f"{len(pokemon_records)} Pokemon records, "
        f"{len(move_records)} move records, "
        f"{len(level_up_move_table['species'])} level-up tables, and "
        f"{len(sprite_sheets)} battle sprite sheets."
    )


def parse_pokemon_records(
    personal: NARC,
    learnsets: dict[int, list[dict[str, int]]],
    evolutions: dict[int, list[dict[str, int]]],
    pokemon_names: dict[int, str],
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
        name = pokemon_names.get(species_id)
        form = EXTRA_FORM_SPECIES.get(species_id)
        if form:
            name = form["name"]
        if not name:
            raise ValueError(f"Pokemon record {species_id} has no decoded name")

        record: dict[str, Any] = {
            "speciesId": species_id,
            "nationalDexId": (
                species_id if 1 <= species_id <= NATIONAL_DEX_SPECIES_COUNT else None
            ),
            "name": name,
            "encounterable": 1 <= species_id <= NATIONAL_DEX_SPECIES_COUNT,
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
        if form:
            record["form"] = {
                "baseSpeciesId": form["baseSpeciesId"],
                "name": form["formName"],
            }

        records.append(record)

    return records


def parse_pokemon_names(message_data: bytes, character_map_data: bytes) -> dict[int, str]:
    if len(character_map_data) % 2 != 0:
        raise ValueError(
            f"{KOREAN_CHARACTER_MAP_PATH} has an odd byte length: "
            f"{len(character_map_data)}"
        )

    character_map = [
        read_u16le(character_map_data, offset)
        for offset in range(0, len(character_map_data), 2)
    ]
    validate_exact_value(
        f"{KOREAN_CHARACTER_MAP_PATH} character count",
        len(character_map),
        EXPECTED_KOREAN_CHARACTER_COUNT,
    )

    if len(message_data) < 4:
        raise ValueError(
            f"Pokemon name message {POKEMON_NAME_MESSAGE_INDEX} is too short: "
            f"{len(message_data)} bytes"
        )

    entry_count = read_u16le(message_data, 0)
    seed = read_u16le(message_data, 2)
    validate_exact_value(
        f"Pokemon name message {POKEMON_NAME_MESSAGE_INDEX} entry count",
        entry_count,
        EXPECTED_POKEMON_NAME_COUNT,
    )

    table_end = 4 + entry_count * 8
    if table_end > len(message_data):
        raise ValueError(
            f"Pokemon name message table ends at {table_end}, "
            f"past its {len(message_data)}-byte payload"
        )

    names: dict[int, str] = {}
    table_key_base = (seed * MESSAGE_TABLE_KEY_MULTIPLIER) & 0xFFFF
    for species_id in range(1, entry_count):
        table_offset = 4 + species_id * 8
        table_key = (table_key_base * (species_id + 1)) & 0xFFFF
        table_key_32 = table_key | (table_key << 16)
        string_offset = read_u32le(message_data, table_offset) ^ table_key_32
        string_length = read_u32le(message_data, table_offset + 4) ^ table_key_32

        if string_length <= 0:
            raise ValueError(f"Pokemon name {species_id} has no encoded characters")
        if string_offset < table_end or string_offset + string_length * 2 > len(message_data):
            raise ValueError(
                f"Pokemon name {species_id} points outside its message payload: "
                f"offset={string_offset}, length={string_length}"
            )

        string_key = (
            MESSAGE_STRING_KEY_MULTIPLIER * (species_id + 1)
        ) & 0xFFFF
        decoded_characters: list[str] = []
        found_terminator = False
        for character_number in range(string_length):
            encoded_character = read_u16le(
                message_data,
                string_offset + character_number * 2,
            )
            character_code = encoded_character ^ string_key
            string_key = (string_key + MESSAGE_STRING_KEY_INCREMENT) & 0xFFFF

            if character_code == 0xFFFF:
                found_terminator = True
                break
            if character_code == 0xF100:
                raise ValueError(
                    f"Pokemon name {species_id} unexpectedly uses compressed text"
                )

            standard_character = GEN4_STANDARD_NAME_CHARACTERS.get(character_code)
            if standard_character:
                decoded_characters.append(standard_character)
                continue

            character_index = character_code - KOREAN_CHARACTER_CODE_OFFSET
            if not 0 <= character_index < len(character_map):
                raise ValueError(
                    f"Pokemon name {species_id} has unmapped character code "
                    f"0x{character_code:04x}"
                )

            unicode_code_point = character_map[character_index]
            if unicode_code_point == 0:
                raise ValueError(
                    f"Pokemon name {species_id} maps character code "
                    f"0x{character_code:04x} to U+0000"
                )
            decoded_characters.append(chr(unicode_code_point))

        if not found_terminator:
            raise ValueError(f"Pokemon name {species_id} has no terminator")

        name = "".join(decoded_characters)
        if not name:
            raise ValueError(f"Pokemon name {species_id} decoded to an empty string")
        names[species_id] = name

    return names


def validate_pokemon_names(pokemon_names: dict[int, str]) -> None:
    validate_exact_value(
        "decoded Pokemon name count",
        len(pokemon_names),
        EXPECTED_POKEMON_NAME_COUNT - 1,
    )
    for species_id, expected_name in EXPECTED_POKEMON_NAMES.items():
        validate_exact_value(
            f"Pokemon name {species_id}",
            pokemon_names.get(species_id),
            expected_name,
        )


def build_battle_sprite_sheets(battle_sprites: NARC) -> dict[str, Image.Image]:
    sheets: dict[str, Image.Image] = {}

    for side in ("front", "back"):
        for start_species_id, end_species_id in BATTLE_SPRITE_SHEET_RANGES:
            filename = f"{side}-{start_species_id}-{end_species_id}.png"
            sheet = Image.new(
                "RGBA",
                (BATTLE_SPRITE_SHEET_SIZE, BATTLE_SPRITE_SHEET_SIZE),
                (0, 0, 0, 0),
            )

            for species_id in range(start_species_id, end_species_id + 1):
                frame = decode_battle_sprite_frame(battle_sprites, species_id, side)
                frame_index = species_id - start_species_id
                frame_x = (
                    frame_index % BATTLE_SPRITE_SHEET_COLUMNS
                ) * BATTLE_SPRITE_FRAME_SIZE
                frame_y = (
                    frame_index // BATTLE_SPRITE_SHEET_COLUMNS
                ) * BATTLE_SPRITE_FRAME_SIZE
                sheet.paste(frame, (frame_x, frame_y))

            sheets[filename] = sheet

    return sheets


def decode_battle_sprite_frame(
    battle_sprites: NARC,
    species_id: int,
    side: str,
) -> Image.Image:
    member_offsets = BATTLE_SPRITE_MEMBER_OFFSETS[side]
    member_base = species_id * BATTLE_SPRITE_MEMBERS_PER_SPECIES
    default_member = bytes(
        battle_sprites.files[member_base + member_offsets["default"]]
    )
    sprite_data = default_member
    if not sprite_data:
        sprite_data = bytes(
            battle_sprites.files[member_base + member_offsets["fallback"]]
        )
    if not sprite_data:
        raise ValueError(f"Pokemon {species_id} has no {side} battle sprite")

    palette_data = bytes(
        battle_sprites.files[member_base + BATTLE_SPRITE_PALETTE_MEMBER_OFFSET]
    )
    palette = decode_battle_sprite_palette(palette_data, species_id)
    pixel_indexes = decrypt_battle_sprite_pixels(sprite_data, species_id, side)
    rgba_pixels = bytearray()
    for packed_indexes in pixel_indexes:
        rgba_pixels.extend(palette[packed_indexes & 0x0F])
        rgba_pixels.extend(palette[packed_indexes >> 4])

    image = Image.frombytes("RGBA", BATTLE_SPRITE_SOURCE_SIZE, bytes(rgba_pixels))
    return image.crop((0, 0, BATTLE_SPRITE_FRAME_SIZE, BATTLE_SPRITE_FRAME_SIZE))


def decrypt_battle_sprite_pixels(
    sprite_data: bytes,
    species_id: int,
    side: str,
) -> bytes:
    expected_pixel_data_size = (
        BATTLE_SPRITE_SOURCE_SIZE[0] * BATTLE_SPRITE_SOURCE_SIZE[1] // 2
    )
    expected_file_size = 0x30 + expected_pixel_data_size
    if len(sprite_data) != expected_file_size:
        raise ValueError(
            f"Pokemon {species_id} {side} NCGR has {len(sprite_data)} bytes; "
            f"expected {expected_file_size}"
        )
    if sprite_data[:4] != b"RGCN" or sprite_data[16:20] != b"RAHC":
        raise ValueError(f"Pokemon {species_id} {side} sprite is not a supported NCGR")

    encrypted_pixels = sprite_data[0x30:]
    encryption_seed = read_u16le(encrypted_pixels, 0)
    decrypted_pixels = bytearray()
    for offset in range(0, len(encrypted_pixels), 2):
        encrypted_word = read_u16le(encrypted_pixels, offset)
        decrypted_word = encrypted_word ^ (encryption_seed & 0xFFFF)
        decrypted_pixels.extend(decrypted_word.to_bytes(2, "little"))
        encryption_seed = (
            encryption_seed * BATTLE_SPRITE_ENCRYPTION_MULTIPLIER
            + BATTLE_SPRITE_ENCRYPTION_INCREMENT
        ) & 0xFFFFFFFF

    return bytes(decrypted_pixels)


def decode_battle_sprite_palette(
    palette_data: bytes,
    species_id: int,
) -> list[tuple[int, int, int, int]]:
    expected_file_size = 0x28 + 16 * 2
    if len(palette_data) != expected_file_size:
        raise ValueError(
            f"Pokemon {species_id} NCLR has {len(palette_data)} bytes; "
            f"expected {expected_file_size}"
        )
    if palette_data[:4] != b"RLCN" or palette_data[16:20] != b"TTLP":
        raise ValueError(f"Pokemon {species_id} palette is not a supported NCLR")

    palette: list[tuple[int, int, int, int]] = []
    for color_index in range(16):
        color = read_u16le(palette_data, 0x28 + color_index * 2)
        if color_index == 0:
            palette.append((0, 0, 0, 0))
            continue

        palette.append(
            (
                (color & 0x1F) << 3,
                ((color >> 5) & 0x1F) << 3,
                ((color >> 10) & 0x1F) << 3,
                255,
            )
        )

    return palette


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
                "typeName": (
                    GEN4_TYPE_NAMES[type_id]
                    if type_id < len(GEN4_TYPE_NAMES)
                    else f"type-{type_id}"
                ),
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


def read_u32le(data: bytes, offset: int) -> int:
    return int.from_bytes(data[offset : offset + 4], "little")


def validate_exact_value(label: str, actual: Any, expected: Any) -> None:
    if actual != expected:
        raise ValueError(f"Unexpected {label}: expected {expected!r}, got {actual!r}")


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


def write_sprite_sheets(directory: Path, sprite_sheets: dict[str, Image.Image]) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    for filename, sprite_sheet in sprite_sheets.items():
        sprite_sheet.save(directory / filename, format="PNG")


if __name__ == "__main__":
    main()
