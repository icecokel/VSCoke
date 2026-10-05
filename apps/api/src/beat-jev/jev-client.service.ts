import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GameId, GameView } from './beat-jev.types';

const gameGoals: Record<GameId, string> = {
  'connect-four': 'Connect four of your discs before the player does.',
  othello: 'Finish with more discs than the player.',
  'dots-and-boxes': 'Complete and claim more boxes than the player.',
  isolation: 'Leave the player without a legal move.',
  battleship: 'Find and sink all opposing ships first.',
  codebreaker: 'Deduce the hidden three-color code in fewer turns.',
  'yacht-dice': 'Maximize your score across three turns.',
  'dice-stop': 'Score more than the player by choosing when to stop.',
  'bomb-dodge': 'Choose a covered square; the bomb location is hidden.',
  'blind-card': 'Choose a face-down card; the card values are hidden.',
};

const gameRules: Record<GameId, string> = {
  'connect-four':
    'The board is 5 by 5, top row first. A disc falls to the lowest empty square in the selected column. Four connected discs horizontally, vertically, or diagonally win.',
  othello:
    'The board is 8 by 8, top row first. Place a disc only where it encloses opposing discs in a straight line in any of eight directions; all enclosed discs flip. A side without a legal move passes automatically. The player with more discs after neither side can move wins.',
  'dots-and-boxes':
    'Draw one unused edge. Completing a box claims it and grants another turn. Claim more of the nine boxes to win.',
  isolation:
    'Each side moves one square orthogonally on a 5 by 5 board. The square left behind becomes blocked forever. The side unable to move loses.',
  battleship:
    'Attack one untried square on the opponent 4 by 4 grid. Each side has ships of lengths two and one. The ownShots list shows your previous hits and misses. Sink both ships first.',
  codebreaker:
    'Guess a hidden three-digit code using digits 0 through 3. Repeated digits are possible. exact counts correct digit and position; colorOnly counts correct digit in the wrong position. Solve in fewer rounds, at most six.',
  'yacht-dice':
    'Each side has three scoring turns. Five dice are rolled up to three times per turn including the first roll. A hold mask keeps dice marked 1 and rerolls dice marked 0. Score one unused category each turn, even for zero. Choice and four of a kind score the sum of all dice; full house scores the sum for an exact 3+2 split; small straight scores 15, large straight 30, and yacht 50.',
  'dice-stop':
    'Each side has three turns. A roll of 2 through 6 adds that many temporary points. A roll of 1 loses only the current turn points. Stop to bank them. The fifth roll automatically ends the turn.',
  'bomb-dodge':
    'One of sixteen covered squares hides a bomb. There are no clues; every unopened square is equally likely. Choosing the bomb loses immediately.',
  'blind-card':
    'Ten face-down cards contain the distinct values 1 through 10. The player and JEV each choose one card without seeing any values. The higher card wins.',
};

const describeAction = (view: GameView, action: string): string => {
  if (action.startsWith('hold:')) {
    const mask = action.slice(5);
    const kept = [...mask]
      .flatMap((bit, index) => (bit === '1' ? [index + 1] : []))
      .join(', ');
    return `Keep dice at positions ${kept || 'none'} and reroll the others.`;
  }
  if (action.startsWith('score:')) {
    const category = action.slice(6);
    const scores = view.data.availableScores;
    const points =
      scores && typeof scores === 'object'
        ? (scores as Record<string, unknown>)[category]
        : undefined;
    return `Record ${category}${typeof points === 'number' ? ` for ${points} points` : ''}.`;
  }
  if (action.startsWith('column:')) {
    return `Drop a disc into column ${action.slice(7)} (zero-based from the left).`;
  }
  if (action.startsWith('cell:')) {
    const cell = Number(action.slice(5));
    const width =
      view.gameId === 'othello' ? 8 : view.gameId === 'battleship' ? 4 : 5;
    return `Choose row ${Math.floor(cell / width)}, column ${cell % width} (zero-based).`;
  }
  if (action.startsWith('edge:')) {
    return `Draw ${action.slice(5)} (h is a horizontal edge; v is a vertical edge; indices are zero-based).`;
  }
  if (action.startsWith('code:')) {
    return `Guess the color code ${action.slice(5)}.`;
  }
  if (action.startsWith('pick:')) {
    return `Choose covered position ${action.slice(5)}.`;
  }
  return action === 'stop'
    ? 'Bank the current turn points.'
    : 'Roll the die again.';
};

@Injectable()
export class JevClientService {
  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.configService.get<string>('JEV_API_KEY')?.trim());
  }

  async chooseAction(view: GameView): Promise<string> {
    const apiKey = this.configService.get<string>('JEV_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'JEV API 키가 설정되지 않았습니다.',
      );
    }

    if (view.legalActions.length === 0) {
      throw new BadGatewayException('JEV의 유효한 행동이 없습니다.');
    }

    const criteria = Object.fromEntries(
      view.legalActions.map((action) => [action, describeAction(view, action)]),
    );

    let response: Response;
    try {
      response = await fetch('https://api.typesafe.ai/v1/systemone', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'jev-latest',
          state: {
            gameId: view.gameId,
            goal: gameGoals[view.gameId],
            rules: gameRules[view.gameId],
            game: view.data,
            legalActions: view.legalActions,
          },
          questions: {
            move: {
              type: 'choice',
              instructions:
                'You are JEV. Choose the strongest legal action for your goal. ' +
                'Use only the information in the supplied game state.',
              criteria,
            },
          },
        }),
        signal: AbortSignal.timeout(12_000),
      });
    } catch {
      throw new ServiceUnavailableException('JEV API에 연결할 수 없습니다.');
    }

    if (!response.ok) {
      throw new BadGatewayException('JEV API가 요청을 처리하지 못했습니다.');
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new BadGatewayException('JEV API 응답을 읽을 수 없습니다.');
    }

    const answer = this.readChoice(payload);
    if (!view.legalActions.includes(answer)) {
      throw new BadGatewayException(
        'JEV API가 유효하지 않은 행동을 반환했습니다.',
      );
    }

    return answer;
  }

  private readChoice(payload: unknown): string {
    if (!payload || typeof payload !== 'object') {
      throw new BadGatewayException('JEV API 응답 형식이 올바르지 않습니다.');
    }
    const answers = (payload as Record<string, unknown>).answers;
    if (!answers || typeof answers !== 'object') {
      throw new BadGatewayException('JEV API 응답 형식이 올바르지 않습니다.');
    }
    const move = (answers as Record<string, unknown>).move;
    if (!move || typeof move !== 'object') {
      throw new BadGatewayException('JEV API 응답 형식이 올바르지 않습니다.');
    }
    const choice = (move as Record<string, unknown>).choice;
    if (typeof choice !== 'string') {
      throw new BadGatewayException('JEV API 응답 형식이 올바르지 않습니다.');
    }
    return choice;
  }
}
