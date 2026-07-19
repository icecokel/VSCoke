import {
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { GoogleAuthGuard } from '../src/auth/google-auth.guard';
import type { User } from '../src/auth/entities/user.entity';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { getCorsOptions } from '../src/common/utils/cors.util';

const E2E_TOKEN_PATTERN = /^poke-lounge-e2e-token-([1-5])$/;
const E2E_TABLES = [
  'poke_lounge_competitive_action',
  'poke_lounge_competitive_match',
  'poke_lounge_competitive_seat',
  'poke_lounge_room_command',
  'poke_lounge_room',
  'game_history',
  'game_poke_lounge_state',
] as const;
const E2E_USER_COUNT = 5;

type AuthenticatedRequest = Request & { user?: User };
type E2eHttpAdapter = {
  get(
    path: string,
    handler: (request: Request, response: Response) => void,
  ): void;
};
type E2eMatchAssertion = {
  matchId: string;
  status: string;
  currentTurn: number;
  bracketMatchId: string | null;
  kind: string | null;
};
type E2eActionAssertion = {
  matchId: string;
  playerId: string;
  turn: number;
  kind: string;
};

class PokeLoungeE2eAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token =
      typeof authorization === 'string' && authorization.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : '';
    const match = E2E_TOKEN_PATTERN.exec(token);

    if (!match) {
      throw new UnauthorizedException('Unknown Poke Lounge E2E identity');
    }

    const identityNumber = match[1];
    request.user = {
      id: `e2e-user-${identityNumber}`,
      email: `e2e-user-${identityNumber}@example.test`,
      firstName: 'E2E',
      lastName: `User ${identityNumber}`,
      accessToken: '',
    };
    return true;
  }
}

async function bootstrap(): Promise<void> {
  assertE2eBoundary();

  const testingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(GoogleAuthGuard)
    .useClass(PokeLoungeE2eAuthGuard)
    .compile();
  const app = testingModule.createNestApplication();

  app.enableCors(getCorsOptions(process.env.CORS_ORIGINS));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  if (process.env.POKE_LOUNGE_E2E_RESET_DB === '1') {
    await resetE2eTables(testingModule.get(DataSource));
  }

  const httpAdapterInstance: unknown = app.getHttpAdapter().getInstance();
  registerDatabaseAssertionEndpoint(
    httpAdapterInstance as E2eHttpAdapter,
    testingModule.get(DataSource),
  );

  const port = Number.parseInt(process.env.PORT ?? '', 10) || 3001;
  await app.listen(port, '127.0.0.1');

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

function assertE2eBoundary(): void {
  if (process.env.NODE_ENV !== 'test' || process.env.POKE_LOUNGE_E2E !== '1') {
    throw new Error(
      'Poke Lounge E2E API requires NODE_ENV=test and POKE_LOUNGE_E2E=1',
    );
  }

  const databaseName = process.env.DB_DATABASE?.trim();
  if (!databaseName?.endsWith('_test')) {
    throw new Error(
      'Poke Lounge E2E API requires a DB_DATABASE ending in _test',
    );
  }
}

async function resetE2eTables(dataSource: DataSource): Promise<void> {
  const existingTables = await dataSource.query<{ table_name: string }[]>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])`,
    [E2E_TABLES],
  );
  const existingNames = new Set(existingTables.map((row) => row.table_name));
  const missingTables = E2E_TABLES.filter((table) => !existingNames.has(table));

  if (missingTables.length > 0) {
    throw new Error(
      `Poke Lounge E2E database schema is not migrated: ${missingTables.join(', ')}`,
    );
  }

  const quotedTables = E2E_TABLES.map((table) => `"${table}"`).join(', ');
  await dataSource.query(
    `TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE`,
  );

  for (
    let identityNumber = 1;
    identityNumber <= E2E_USER_COUNT;
    identityNumber += 1
  ) {
    const id = `e2e-user-${identityNumber}`;
    await dataSource.query(
      `INSERT INTO "user" (id, email, "firstName", "lastName", "accessToken")
       VALUES ($1, $2, 'E2E', $3, NULL)
       ON CONFLICT (id) DO UPDATE
         SET email = EXCLUDED.email,
             "firstName" = EXCLUDED."firstName",
             "lastName" = EXCLUDED."lastName",
             "accessToken" = NULL`,
      [id, `${id}@example.test`, `User ${identityNumber}`],
    );
  }
}

function registerDatabaseAssertionEndpoint(
  expressApp: E2eHttpAdapter,
  dataSource: DataSource,
): void {
  expressApp.get('/__e2e/poke-lounge/assertions', (request, response) => {
    const roomCodeQuery = request.query.roomCode;
    const roomCode = typeof roomCodeQuery === 'string' ? roomCodeQuery : '';
    void readDatabaseAssertions(dataSource, roomCode).then(
      (assertions) => response.status(200).json(assertions),
      (error) =>
        response.status(500).json({
          message: error instanceof Error ? error.message : String(error),
        }),
    );
  });
}

async function readDatabaseAssertions(
  dataSource: DataSource,
  rawRoomCode: string,
) {
  const roomCode = rawRoomCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{1,6}$/.test(roomCode)) {
    throw new Error('A canonical roomCode is required');
  }

  const [room] = await dataSource.query<
    Array<{ id: string; revision: string; state: { tournament?: unknown } }>
  >(
    `SELECT id, revision, state
       FROM poke_lounge_room
      WHERE room_code = $1`,
    [roomCode],
  );
  if (!room) {
    throw new Error('Poke Lounge E2E room was not found');
  }

  const [seatCounts] = await dataSource.query<
    Array<{ seatCount: string; accountCount: string }>
  >(
    `SELECT COUNT(*)::text AS "seatCount",
            COUNT(DISTINCT account_id)::text AS "accountCount"
       FROM poke_lounge_competitive_seat
      WHERE room_id = $1`,
    [room.id],
  );
  const matchColumns = await dataSource.query<Array<{ column_name: string }>>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'poke_lounge_competitive_match'
        AND column_name = ANY($1::text[])`,
    [['bracket_match_id', 'kind']],
  );
  const existingMatchColumns = new Set(
    matchColumns.map((row) => row.column_name),
  );
  const optionalSelect = [
    existingMatchColumns.has('bracket_match_id')
      ? 'bracket_match_id AS "bracketMatchId"'
      : 'NULL::text AS "bracketMatchId"',
    existingMatchColumns.has('kind') ? 'kind' : 'NULL::text AS kind',
  ].join(', ');
  const matches = await dataSource.query<E2eMatchAssertion[]>(
    `SELECT match_id AS "matchId", status, current_turn AS "currentTurn", ${optionalSelect}
       FROM poke_lounge_competitive_match
      WHERE room_id = $1
      ORDER BY created_at ASC`,
    [room.id],
  );
  const actions = await dataSource.query<E2eActionAssertion[]>(
    `SELECT match_id AS "matchId",
            actor_player_id AS "playerId",
            turn,
            action ->> 'kind' AS kind
       FROM poke_lounge_competitive_action
      WHERE room_id = $1
      ORDER BY created_at ASC, actor_player_id ASC`,
    [room.id],
  );
  const actionEvidence = summarizeActionEvidence(actions);
  const [historyCounts] = await dataSource.query<
    Array<{ historyCount: string }>
  >(
    `SELECT COUNT(*)::text AS "historyCount"
       FROM game_history
      WHERE "gameType" = 'POKE_LOUNGE'`,
  );

  return {
    roomCode,
    revision: Number(room.revision),
    tournament: room.state.tournament ?? null,
    seatCount: Number(seatCounts?.seatCount ?? 0),
    distinctAccountCount: Number(seatCounts?.accountCount ?? 0),
    matches,
    actionCount: actions.length,
    ...actionEvidence,
    gameHistoryCount: Number(historyCounts?.historyCount ?? 0),
  };
}

export function summarizeActionEvidence(actions: E2eActionAssertion[]) {
  const actionKindCounts = { move: 0, switch: 0 };
  const forcedSwitchTurns: Array<{
    matchId: string;
    playerId: string;
    turn: number;
  }> = [];

  for (const action of actions) {
    if (action.kind !== 'move' && action.kind !== 'switch') {
      throw new Error(`Unknown competitive action kind: ${action.kind}`);
    }

    actionKindCounts[action.kind] += 1;
    if (action.kind === 'switch') {
      forcedSwitchTurns.push({
        matchId: action.matchId,
        playerId: action.playerId,
        turn: action.turn,
      });
    }
  }

  return { actionKindCounts, forcedSwitchTurns };
}

if (require.main === module) {
  void bootstrap().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
