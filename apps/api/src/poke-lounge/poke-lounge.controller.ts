import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PokeLoungeRoomService } from './poke-lounge-room.service';
import type {
  CreatePokeLoungeRoomInput,
  JoinPokeLoungeRoomInput,
  SubmitPokeLoungeMatchResultInput,
} from './poke-lounge-room.types';

@ApiTags('poke-lounge')
@Controller('poke-lounge')
export class PokeLoungeController {
  constructor(private readonly roomService: PokeLoungeRoomService) {}

  @Post('rooms')
  createRoom(@Body() body?: CreatePokeLoungeRoomInput) {
    return this.roomService.createRoom(body ?? {});
  }

  @Get('rooms/:roomCode')
  getRoom(@Param('roomCode') roomCode: string, @Query('nowMs') nowMs?: string) {
    return this.roomService.getRoom(roomCode, parseOptionalNumber(nowMs));
  }

  @Post('rooms/:roomCode/join')
  joinRoom(
    @Param('roomCode') roomCode: string,
    @Body() body?: JoinPokeLoungeRoomInput,
  ) {
    return this.roomService.joinRoom(roomCode, body ?? {});
  }

  @Post('rooms/:roomCode/ready')
  setReady(
    @Param('roomCode') roomCode: string,
    @Body()
    body?: {
      playerId?: string;
      ready: boolean;
      nowMs?: number;
    },
  ) {
    return this.roomService.setReady(
      roomCode,
      body?.playerId ?? '',
      Boolean(body?.ready),
      body?.nowMs,
    );
  }

  @Post('rooms/:roomCode/result')
  submitResult(
    @Param('roomCode') roomCode: string,
    @Body() body?: SubmitPokeLoungeMatchResultInput,
  ) {
    return this.roomService.submitMatchResult(
      roomCode,
      body ?? {
        reportingPlayerId: '',
        matchId: '',
        winnerPlayerId: '',
        loserPlayerId: '',
        reason: 'faint',
      },
    );
  }

  @Post('rooms/:roomCode/leave')
  leaveRoom(
    @Param('roomCode') roomCode: string,
    @Body()
    body?: {
      playerId?: string;
      nowMs?: number;
    },
  ) {
    return this.roomService.leaveRoom(
      roomCode,
      body?.playerId ?? '',
      body?.nowMs,
    );
  }
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}
