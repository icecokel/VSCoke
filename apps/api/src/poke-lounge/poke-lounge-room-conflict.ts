import { ConflictException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { PokeLoungeRoomResponseDto } from './dto/poke-lounge-room-response.dto';
import type { PokeLoungeRoomSnapshot } from './poke-lounge-room.repository';
import type { PokeLoungePublicRoomState } from './poke-lounge-room.types';

export type PokeLoungeRoomConflictKind = 'revision' | 'idempotency';

export class PokeLoungeRoomConflictResponseDto {
  @ApiProperty({ example: 409 })
  statusCode!: number;

  @ApiProperty({
    enum: ['POKE_LOUNGE_REVISION_CONFLICT', 'POKE_LOUNGE_IDEMPOTENCY_CONFLICT'],
  })
  code!: 'POKE_LOUNGE_REVISION_CONFLICT' | 'POKE_LOUNGE_IDEMPOTENCY_CONFLICT';

  @ApiProperty({ example: 'Poke Lounge room revision conflict' })
  message!: string;

  @ApiProperty({ type: PokeLoungeRoomResponseDto })
  snapshot!: PokeLoungeRoomResponseDto;
}

export class PokeLoungeRoomConflict extends ConflictException {
  constructor(
    kind: PokeLoungeRoomConflictKind,
    snapshot: PokeLoungeRoomSnapshot,
  ) {
    const idempotency = kind === 'idempotency';

    super({
      statusCode: 409,
      code: idempotency
        ? 'POKE_LOUNGE_IDEMPOTENCY_CONFLICT'
        : 'POKE_LOUNGE_REVISION_CONFLICT',
      message: idempotency
        ? 'Poke Lounge room idempotency conflict'
        : 'Poke Lounge room revision conflict',
      snapshot: toPokeLoungePublicRoomState(snapshot),
    });
  }
}

export class PokeLoungePartySnapshotLocked extends ConflictException {
  constructor() {
    super({
      statusCode: 409,
      code: 'POKE_LOUNGE_PARTY_SNAPSHOT_LOCKED',
      message: 'Poke Lounge party snapshot is locked',
    });
  }
}

export function toPokeLoungePublicRoomState(
  room: PokeLoungeRoomSnapshot,
): PokeLoungePublicRoomState {
  return {
    ...room,
    partySnapshots: Object.fromEntries(
      Object.entries(room.partySnapshots).map(([playerId, snapshot]) => [
        playerId,
        toPublicPartySnapshot(snapshot),
      ]),
    ),
    competitiveTransitions: structuredClone(room.competitiveTransitions ?? []),
    participants: room.participants.map((participant) => ({
      playerId: participant.playerId,
      displayName: participant.displayName,
      role: participant.role,
      ready: participant.ready,
      connected:
        participant.connected &&
        participant.presencePendingUntilMs === undefined,
      joinedAtMs: participant.joinedAtMs,
      ...(participant.leftAtMs === undefined
        ? {}
        : { leftAtMs: participant.leftAtMs }),
    })),
  };
}

function toPublicPartySnapshot(
  snapshot: PokeLoungeRoomSnapshot['partySnapshots'][string],
): PokeLoungePublicRoomState['partySnapshots'][string] {
  const representative = snapshot.competitiveParty.members.find(
    (member) => member.slotIndex === snapshot.competitiveParty.activeSlotIndex,
  );
  if (!representative) {
    throw new Error('Competitive party representative is missing');
  }

  return {
    playerId: snapshot.playerId,
    ...(snapshot.displayName ? { displayName: snapshot.displayName } : {}),
    representativePokemon: {
      speciesId: representative.speciesId,
      level: representative.level,
      currentHp: representative.currentHp,
      maxHp: representative.maxHp,
    },
    partySize: snapshot.competitiveParty.members.length,
    updatedAtMs: snapshot.updatedAtMs,
  };
}
