import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CreatePokeLoungeRoomDto } from './dto/create-poke-lounge-room.dto';
import { JoinPokeLoungeRoomDto } from './dto/join-poke-lounge-room.dto';
import { LeavePokeLoungeRoomDto } from './dto/leave-poke-lounge-room.dto';
import { PokeLoungeRoomResponseDto } from './dto/poke-lounge-room-response.dto';
import { SetPokeLoungeReadyDto } from './dto/set-poke-lounge-ready.dto';
import { SubmitPokeLoungeMatchResultDto } from './dto/submit-poke-lounge-match-result.dto';
import { UpdatePokeLoungePartySnapshotDto } from './dto/update-poke-lounge-party-snapshot.dto';
import type { PokeLoungeRoomCommandContext } from './poke-lounge-room-command';
import {
  PokeLoungeRoomConflictResponseDto,
  toPokeLoungePublicRoomState,
} from './poke-lounge-room-conflict';
import { PokeLoungeRoomService } from './poke-lounge-room.service';

const IDEMPOTENCY_HEADER = 'X-Idempotency-Key';
const REVISION_HEADER = 'If-Match-Revision';
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const REVISION_PATTERN = /^(0|[1-9][0-9]*)$/;

@ApiTags('poke-lounge')
@Controller('poke-lounge')
export class PokeLoungeController {
  constructor(private readonly roomService: PokeLoungeRoomService) {}

  @Post('rooms')
  @ApiHeader({ name: IDEMPOTENCY_HEADER, required: true })
  @ApiHeader({ name: REVISION_HEADER, required: true, example: '0' })
  @ApiBody({ type: CreatePokeLoungeRoomDto })
  @ApiCreatedResponse({ type: PokeLoungeRoomResponseDto })
  @ApiConflictResponse({ type: PokeLoungeRoomConflictResponseDto })
  async createRoom(
    @Body() body: CreatePokeLoungeRoomDto | undefined,
    @Req() request: Request,
  ) {
    const command = parseRoomCommandHeaders(request);

    if (command.expectedRevision !== 0) {
      throw new BadRequestException(
        'If-Match-Revision must be 0 when creating a room',
      );
    }

    return toPokeLoungePublicRoomState(
      await this.roomService.createRoom(body ?? { sessionId: '' }, command),
    );
  }

  @Get('rooms/:roomCode')
  @ApiOkResponse({ type: PokeLoungeRoomResponseDto })
  async getRoom(
    @Param('roomCode') roomCode: string,
    @Query('nowMs') nowMs?: string,
  ) {
    return toPokeLoungePublicRoomState(
      await this.roomService.getRoom(roomCode, parseOptionalNumber(nowMs)),
    );
  }

  @Post('rooms/:roomCode/join')
  @ApiHeader({ name: IDEMPOTENCY_HEADER, required: true })
  @ApiHeader({ name: REVISION_HEADER, required: true, example: '0' })
  @ApiBody({ type: JoinPokeLoungeRoomDto })
  @ApiCreatedResponse({ type: PokeLoungeRoomResponseDto })
  @ApiConflictResponse({ type: PokeLoungeRoomConflictResponseDto })
  async joinRoom(
    @Param('roomCode') roomCode: string,
    @Body() body: JoinPokeLoungeRoomDto | undefined,
    @Req() request: Request,
  ) {
    const command = parseRoomCommandHeaders(request);

    return toPokeLoungePublicRoomState(
      await this.roomService.joinRoom(
        roomCode,
        body ?? { sessionId: '' },
        command,
      ),
    );
  }

  @Post('rooms/:roomCode/ready')
  @ApiHeader({ name: IDEMPOTENCY_HEADER, required: true })
  @ApiHeader({ name: REVISION_HEADER, required: true, example: '0' })
  @ApiBody({ type: SetPokeLoungeReadyDto })
  @ApiCreatedResponse({ type: PokeLoungeRoomResponseDto })
  @ApiConflictResponse({ type: PokeLoungeRoomConflictResponseDto })
  async setReady(
    @Param('roomCode') roomCode: string,
    @Body() body: SetPokeLoungeReadyDto | undefined,
    @Req() request: Request,
  ) {
    const command = parseRoomCommandHeaders(request);

    return toPokeLoungePublicRoomState(
      await this.roomService.setReady(
        roomCode,
        {
          playerId: body?.playerId ?? '',
          sessionId: body?.sessionId,
          ready: Boolean(body?.ready),
          nowMs: body?.nowMs,
        },
        command,
      ),
    );
  }

  @Post('rooms/:roomCode/party-snapshot')
  @ApiHeader({ name: IDEMPOTENCY_HEADER, required: true })
  @ApiHeader({ name: REVISION_HEADER, required: true, example: '0' })
  @ApiBody({ type: UpdatePokeLoungePartySnapshotDto })
  @ApiCreatedResponse({ type: PokeLoungeRoomResponseDto })
  @ApiConflictResponse({ type: PokeLoungeRoomConflictResponseDto })
  async updatePartySnapshot(
    @Param('roomCode') roomCode: string,
    @Body() body: UpdatePokeLoungePartySnapshotDto | undefined,
    @Req() request: Request,
  ) {
    const command = parseRoomCommandHeaders(request);

    return toPokeLoungePublicRoomState(
      await this.roomService.updatePartySnapshot(
        roomCode,
        body ?? { playerId: '', sessionId: '' },
        command,
      ),
    );
  }

  @Post('rooms/:roomCode/result')
  @ApiHeader({ name: IDEMPOTENCY_HEADER, required: true })
  @ApiHeader({ name: REVISION_HEADER, required: true, example: '0' })
  @ApiBody({ type: SubmitPokeLoungeMatchResultDto })
  @ApiCreatedResponse({ type: PokeLoungeRoomResponseDto })
  @ApiConflictResponse({ type: PokeLoungeRoomConflictResponseDto })
  async submitResult(
    @Param('roomCode') roomCode: string,
    @Body() body: SubmitPokeLoungeMatchResultDto | undefined,
    @Req() request: Request,
  ) {
    const command = parseRoomCommandHeaders(request);

    return toPokeLoungePublicRoomState(
      await this.roomService.submitMatchResult(
        roomCode,
        body ?? {
          reportingPlayerId: '',
          reportingSessionId: '',
          matchId: '',
          winnerPlayerId: '',
          loserPlayerId: '',
          reason: 'faint',
        },
        command,
      ),
    );
  }

  @Post('rooms/:roomCode/leave')
  @ApiHeader({ name: IDEMPOTENCY_HEADER, required: true })
  @ApiHeader({ name: REVISION_HEADER, required: true, example: '0' })
  @ApiBody({ type: LeavePokeLoungeRoomDto })
  @ApiCreatedResponse({ type: PokeLoungeRoomResponseDto })
  @ApiConflictResponse({ type: PokeLoungeRoomConflictResponseDto })
  async leaveRoom(
    @Param('roomCode') roomCode: string,
    @Body() body: LeavePokeLoungeRoomDto | undefined,
    @Req() request: Request,
  ) {
    const command = parseRoomCommandHeaders(request);

    return toPokeLoungePublicRoomState(
      await this.roomService.leaveRoom(
        roomCode,
        {
          playerId: body?.playerId ?? '',
          sessionId: body?.sessionId,
          nowMs: body?.nowMs,
        },
        command,
      ),
    );
  }
}

function parseRoomCommandHeaders(
  request: Request,
): PokeLoungeRoomCommandContext {
  const idempotencyKey = readSingleRawHeader(request, IDEMPOTENCY_HEADER);
  const revisionValue = readSingleRawHeader(request, REVISION_HEADER);

  if (!UUID_V4_PATTERN.test(idempotencyKey)) {
    throw new BadRequestException(
      `${IDEMPOTENCY_HEADER} must be a canonical UUID v4`,
    );
  }

  if (!REVISION_PATTERN.test(revisionValue)) {
    throw new BadRequestException(
      `${REVISION_HEADER} must be a non-negative safe integer`,
    );
  }

  const expectedRevision = Number(revisionValue);

  if (!Number.isSafeInteger(expectedRevision)) {
    throw new BadRequestException(
      `${REVISION_HEADER} must be a non-negative safe integer`,
    );
  }

  return { idempotencyKey, expectedRevision };
}

function readSingleRawHeader(request: Request, headerName: string): string {
  const values: string[] = [];

  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    if (request.rawHeaders[index]?.toLowerCase() === headerName.toLowerCase()) {
      values.push(request.rawHeaders[index + 1] ?? '');
    }
  }

  if (values.length !== 1) {
    throw new BadRequestException(
      `${headerName} header must be provided exactly once`,
    );
  }

  return values[0];
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}
