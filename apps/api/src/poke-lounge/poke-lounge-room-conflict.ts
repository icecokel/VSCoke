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

export function toPokeLoungePublicRoomState(
  room: PokeLoungeRoomSnapshot,
): PokeLoungePublicRoomState {
  return {
    ...room,
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
