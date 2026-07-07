import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PokeLoungeRoomService } from './poke-lounge-room.service';
import { CreatePokeLoungeRoomDto } from './dto/create-poke-lounge-room.dto';
import { JoinPokeLoungeRoomDto } from './dto/join-poke-lounge-room.dto';
import { PokeLoungeRoomResponseDto } from './dto/poke-lounge-room-response.dto';
import { SetPokeLoungeReadyDto } from './dto/set-poke-lounge-ready.dto';
import { SubmitPokeLoungeMatchResultDto } from './dto/submit-poke-lounge-match-result.dto';
import { UpdatePokeLoungePartySnapshotDto } from './dto/update-poke-lounge-party-snapshot.dto';

@ApiTags('poke-lounge')
@Controller('poke-lounge')
export class PokeLoungeController {
  constructor(private readonly roomService: PokeLoungeRoomService) {}

  @Post('rooms')
  @ApiCreatedResponse({ type: PokeLoungeRoomResponseDto })
  createRoom(@Body() body?: CreatePokeLoungeRoomDto) {
    return this.roomService.createRoom(body ?? {});
  }

  @Get('rooms/:roomCode')
  @ApiOkResponse({ type: PokeLoungeRoomResponseDto })
  getRoom(@Param('roomCode') roomCode: string, @Query('nowMs') nowMs?: string) {
    return this.roomService.getRoom(roomCode, parseOptionalNumber(nowMs));
  }

  @Post('rooms/:roomCode/join')
  @ApiCreatedResponse({ type: PokeLoungeRoomResponseDto })
  joinRoom(
    @Param('roomCode') roomCode: string,
    @Body() body?: JoinPokeLoungeRoomDto,
  ) {
    return this.roomService.joinRoom(roomCode, body ?? {});
  }

  @Post('rooms/:roomCode/ready')
  @ApiCreatedResponse({ type: PokeLoungeRoomResponseDto })
  setReady(
    @Param('roomCode') roomCode: string,
    @Body() body?: SetPokeLoungeReadyDto,
  ) {
    return this.roomService.setReady(
      roomCode,
      body?.playerId ?? '',
      Boolean(body?.ready),
      body?.nowMs,
    );
  }

  @Post('rooms/:roomCode/party-snapshot')
  @ApiCreatedResponse({ type: PokeLoungeRoomResponseDto })
  updatePartySnapshot(
    @Param('roomCode') roomCode: string,
    @Body() body?: UpdatePokeLoungePartySnapshotDto,
  ) {
    return this.roomService.updatePartySnapshot(
      roomCode,
      body ?? {
        playerId: '',
      },
    );
  }

  @Post('rooms/:roomCode/result')
  @ApiCreatedResponse({ type: PokeLoungeRoomResponseDto })
  submitResult(
    @Param('roomCode') roomCode: string,
    @Body() body?: SubmitPokeLoungeMatchResultDto,
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
  @ApiCreatedResponse({ type: PokeLoungeRoomResponseDto })
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
