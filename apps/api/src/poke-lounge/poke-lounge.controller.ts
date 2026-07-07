import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PokeLoungeRoomService } from './poke-lounge-room.service';
import { CreatePokeLoungeRoomDto } from './dto/create-poke-lounge-room.dto';
import { JoinPokeLoungeRoomDto } from './dto/join-poke-lounge-room.dto';
import { LeavePokeLoungeRoomDto } from './dto/leave-poke-lounge-room.dto';
import { PokeLoungeRoomResponseDto } from './dto/poke-lounge-room-response.dto';
import { SetPokeLoungeReadyDto } from './dto/set-poke-lounge-ready.dto';
import { SubmitPokeLoungeMatchResultDto } from './dto/submit-poke-lounge-match-result.dto';
import { UpdatePokeLoungePartySnapshotDto } from './dto/update-poke-lounge-party-snapshot.dto';
import type {
  PokeLoungePublicRoomState,
  PokeLoungeRoomState,
} from './poke-lounge-room.types';

@ApiTags('poke-lounge')
@Controller('poke-lounge')
export class PokeLoungeController {
  constructor(private readonly roomService: PokeLoungeRoomService) {}

  @Post('rooms')
  @ApiCreatedResponse({ type: PokeLoungeRoomResponseDto })
  createRoom(@Body() body?: CreatePokeLoungeRoomDto) {
    return toPublicRoomState(
      this.roomService.createRoom(body ?? { sessionId: '' }),
    );
  }

  @Get('rooms/:roomCode')
  @ApiOkResponse({ type: PokeLoungeRoomResponseDto })
  getRoom(@Param('roomCode') roomCode: string, @Query('nowMs') nowMs?: string) {
    return toPublicRoomState(
      this.roomService.getRoom(roomCode, parseOptionalNumber(nowMs)),
    );
  }

  @Post('rooms/:roomCode/join')
  @ApiCreatedResponse({ type: PokeLoungeRoomResponseDto })
  joinRoom(
    @Param('roomCode') roomCode: string,
    @Body() body?: JoinPokeLoungeRoomDto,
  ) {
    return toPublicRoomState(
      this.roomService.joinRoom(roomCode, body ?? { sessionId: '' }),
    );
  }

  @Post('rooms/:roomCode/ready')
  @ApiCreatedResponse({ type: PokeLoungeRoomResponseDto })
  setReady(
    @Param('roomCode') roomCode: string,
    @Body() body?: SetPokeLoungeReadyDto,
  ) {
    return toPublicRoomState(
      this.roomService.setReady(
        roomCode,
        body?.playerId ?? '',
        body?.sessionId,
        Boolean(body?.ready),
        body?.nowMs,
      ),
    );
  }

  @Post('rooms/:roomCode/party-snapshot')
  @ApiCreatedResponse({ type: PokeLoungeRoomResponseDto })
  updatePartySnapshot(
    @Param('roomCode') roomCode: string,
    @Body() body?: UpdatePokeLoungePartySnapshotDto,
  ) {
    return toPublicRoomState(
      this.roomService.updatePartySnapshot(
        roomCode,
        body ?? {
          playerId: '',
          sessionId: '',
        },
      ),
    );
  }

  @Post('rooms/:roomCode/result')
  @ApiCreatedResponse({ type: PokeLoungeRoomResponseDto })
  submitResult(
    @Param('roomCode') roomCode: string,
    @Body() body?: SubmitPokeLoungeMatchResultDto,
  ) {
    return toPublicRoomState(
      this.roomService.submitMatchResult(
        roomCode,
        body ?? {
          reportingPlayerId: '',
          reportingSessionId: '',
          matchId: '',
          winnerPlayerId: '',
          loserPlayerId: '',
          reason: 'faint',
        },
      ),
    );
  }

  @Post('rooms/:roomCode/leave')
  @ApiCreatedResponse({ type: PokeLoungeRoomResponseDto })
  leaveRoom(
    @Param('roomCode') roomCode: string,
    @Body() body?: LeavePokeLoungeRoomDto,
  ) {
    return toPublicRoomState(
      this.roomService.leaveRoom(
        roomCode,
        body?.playerId ?? '',
        body?.sessionId,
        body?.nowMs,
      ),
    );
  }
}

function toPublicRoomState(
  room: PokeLoungeRoomState,
): PokeLoungePublicRoomState {
  return {
    ...room,
    participants: room.participants.map((participant) => ({
      playerId: participant.playerId,
      ...(participant.userId ? { userId: participant.userId } : {}),
      displayName: participant.displayName,
      role: participant.role,
      ready: participant.ready,
      connected: participant.connected,
      joinedAtMs: participant.joinedAtMs,
      ...(participant.leftAtMs === undefined
        ? {}
        : { leftAtMs: participant.leftAtMs }),
    })),
  };
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}
