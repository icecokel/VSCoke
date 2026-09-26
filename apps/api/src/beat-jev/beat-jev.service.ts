import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt, randomUUID } from 'node:crypto';
import { GAME_IDS } from './beat-jev.types';
import type {
  GameEngine,
  GameId,
  GameResult,
  GameState,
  Side,
} from './beat-jev.types';
import { JevClientService } from './jev-client.service';
import { strategyEngines } from './strategy-games';
import { luckEngines } from './luck-games';

const sessionLifetimeMs = 2 * 60 * 60 * 1000;
const randomSource = (): number => randomInt(0, 0x100000000) / 0x100000000;

type MatchStatus = 'PLAYING' | 'ROUND_END' | 'COMPLETE';

interface RoundHistory {
  gameId: GameId;
  result: Exclude<GameResult, null>;
}

interface MatchState {
  id: string;
  revision: number;
  games: GameId[];
  gameIndex: number;
  playerWins: number;
  jevWins: number;
  game: GameState;
  roundStarter: Side;
  history: RoundHistory[];
  lastSeenAt: number;
  isBusy: boolean;
}

export interface MatchSnapshot {
  id: string;
  revision: number;
  games: (GameId | null)[];
  gameIndex: number;
  playerWins: number;
  jevWins: number;
  status: MatchStatus;
  game: ReturnType<GameEngine['view']>;
  history: RoundHistory[];
}

@Injectable()
export class BeatJevService {
  // ponytail: one-process sessions; move to persistent storage if matches must survive restarts or multiple API workers.
  private readonly matches = new Map<string, MatchState>();
  private readonly engines: Partial<Record<GameId, GameEngine>> = {
    ...strategyEngines,
    ...luckEngines,
  };

  constructor(private readonly jevClient: JevClientService) {}

  createMatch(): MatchSnapshot {
    this.pruneExpiredMatches();
    const games = [...GAME_IDS];
    for (let index = 0; index < 3; index += 1) {
      const nextIndex =
        index + Math.floor(randomSource() * (games.length - index));
      [games[index], games[nextIndex]] = [games[nextIndex], games[index]];
    }
    const chosenGames = games.slice(0, 3);
    const game = this.createGame(chosenGames[0]);
    const match: MatchState = {
      id: randomUUID(),
      revision: 0,
      games: chosenGames,
      gameIndex: 0,
      playerWins: 0,
      jevWins: 0,
      game,
      roundStarter: game.turn,
      history: [],
      lastSeenAt: Date.now(),
      isBusy: false,
    };
    this.matches.set(match.id, match);
    return this.toSnapshot(match);
  }

  getMatch(id: string): MatchSnapshot {
    return this.toSnapshot(this.findMatch(id));
  }

  playAction(id: string, action: string, revision: number): MatchSnapshot {
    const match = this.findMatch(id);
    this.assertMutationAllowed(match, revision, 'PLAYING');
    if (match.game.turn !== 'PLAYER') {
      throw new ConflictException('현재는 JEV의 차례입니다.');
    }
    const engine = this.getEngine(match.game.gameId);
    const legalActions = engine.view(match.game, 'PLAYER').legalActions;
    if (!legalActions.includes(action)) {
      throw new BadRequestException('허용되지 않은 행동입니다.');
    }
    match.game = engine.play(match.game, action, randomSource);
    match.revision += 1;
    this.recordResult(match);
    return this.toSnapshot(match);
  }

  async continueJev(id: string, revision: number): Promise<MatchSnapshot> {
    const match = this.findMatch(id);
    this.assertMutationAllowed(match, revision, 'PLAYING');
    if (match.game.turn !== 'JEV') {
      throw new ConflictException('현재는 플레이어의 차례입니다.');
    }

    match.isBusy = true;
    try {
      for (let step = 0; step < 64 && match.game.turn === 'JEV'; step += 1) {
        const engine = this.getEngine(match.game.gameId);
        const jevView = engine.view(match.game, 'JEV');
        if (jevView.result !== null) {
          break;
        }
        const action = await this.jevClient.chooseAction(jevView);
        match.game = engine.play(match.game, action, randomSource);
        match.revision += 1;
        this.recordResult(match);
        if (match.game.result !== null) {
          break;
        }
      }
      return this.toSnapshot(match);
    } finally {
      match.isBusy = false;
    }
  }

  nextGame(id: string, revision: number): MatchSnapshot {
    const match = this.findMatch(id);
    this.assertMutationAllowed(match, revision, 'ROUND_END');
    const wasDraw = match.game.result === 'DRAW';
    if (!wasDraw) {
      match.gameIndex += 1;
    }
    match.game = this.createGame(
      match.games[match.gameIndex],
      wasDraw
        ? match.roundStarter === 'PLAYER'
          ? 'JEV'
          : 'PLAYER'
        : undefined,
    );
    match.roundStarter = match.game.turn;
    match.revision += 1;
    return this.toSnapshot(match);
  }

  private createGame(gameId: GameId, desiredStarter?: Side): GameState {
    let isFirstRandomCall = true;
    const random = (): number => {
      if (isFirstRandomCall && desiredStarter) {
        isFirstRandomCall = false;
        return desiredStarter === 'PLAYER' ? 0 : 0.75;
      }
      isFirstRandomCall = false;
      return randomSource();
    };
    return this.getEngine(gameId).create(random);
  }

  private getEngine(gameId: GameId): GameEngine {
    const engine = this.engines[gameId];
    if (!engine) {
      throw new Error(`등록되지 않은 미니게임: ${gameId}`);
    }
    return engine;
  }

  private status(match: MatchState): MatchStatus {
    if (match.playerWins === 2 || match.jevWins === 2) {
      return 'COMPLETE';
    }
    return match.game.result === null ? 'PLAYING' : 'ROUND_END';
  }

  private recordResult(match: MatchState): void {
    const result = match.game.result;
    if (result === null) {
      return;
    }
    match.history.push({ gameId: match.game.gameId, result });
    if (result === 'PLAYER') {
      match.playerWins += 1;
    } else if (result === 'JEV') {
      match.jevWins += 1;
    }
  }

  private toSnapshot(match: MatchState): MatchSnapshot {
    return {
      id: match.id,
      revision: match.revision,
      games: match.games.map((gameId, index) =>
        index <= match.gameIndex ? gameId : null,
      ),
      gameIndex: match.gameIndex,
      playerWins: match.playerWins,
      jevWins: match.jevWins,
      status: this.status(match),
      game: this.getEngine(match.game.gameId).view(match.game, 'PLAYER'),
      history: [...match.history],
    };
  }

  private assertMutationAllowed(
    match: MatchState,
    revision: number,
    requiredStatus: MatchStatus,
  ): void {
    if (match.isBusy) {
      throw new ConflictException('JEV의 차례가 진행 중입니다.');
    }
    if (match.revision !== revision) {
      throw new ConflictException(
        '게임 상태가 변경되었습니다. 새로고침해 주세요.',
      );
    }
    if (this.status(match) !== requiredStatus) {
      throw new ConflictException('현재 상태에서 실행할 수 없는 행동입니다.');
    }
  }

  private findMatch(id: string): MatchState {
    const match = this.matches.get(id);
    if (!match || Date.now() - match.lastSeenAt > sessionLifetimeMs) {
      this.matches.delete(id);
      throw new NotFoundException('게임을 찾을 수 없습니다.');
    }
    match.lastSeenAt = Date.now();
    return match;
  }

  private pruneExpiredMatches(): void {
    const now = Date.now();
    for (const [id, match] of this.matches) {
      if (now - match.lastSeenAt > sessionLifetimeMs) {
        this.matches.delete(id);
      }
    }
  }
}
