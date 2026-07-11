import { PokeLoungeRoomEventsService } from './poke-lounge-room-events.service';
import { CompetitiveMatchService } from './competitive/competitive-match.service';
import { COMPETITIVE_MATCH_REPOSITORY } from './competitive/competitive-match.repository';
import { PostgresCompetitiveMatchRepository } from './competitive/postgres-competitive-match.repository';
import { PostgresCompetitiveActionRepository } from './competitive/postgres-competitive-action.repository';
import { COMPETITIVE_ACTION_REPOSITORY } from './competitive/competitive-action.repository';
import { POKE_LOUNGE_ROOM_EVENT_PUBLISHER } from './poke-lounge-room-event.publisher';
import { PokeLoungeGateway } from './poke-lounge.gateway';
import { PokeLoungeModule } from './poke-lounge.module';

describe('PokeLoungeModule', () => {
  it('binds committed room events to the Socket.IO gateway publisher', () => {
    const providers = Reflect.getMetadata(
      'providers',
      PokeLoungeModule,
    ) as Array<object | (new (...args: never[]) => unknown)>;

    expect(providers).toContain(PokeLoungeRoomEventsService);
    expect(providers).toContain(PokeLoungeGateway);
    expect(providers).toContain(CompetitiveMatchService);
    expect(providers).toContain(PostgresCompetitiveMatchRepository);
    expect(providers).toContain(PostgresCompetitiveActionRepository);
    expect(providers).toContainEqual({
      provide: COMPETITIVE_ACTION_REPOSITORY,
      useExisting: PostgresCompetitiveActionRepository,
    });
    expect(providers).toContainEqual({
      provide: COMPETITIVE_MATCH_REPOSITORY,
      useExisting: PostgresCompetitiveMatchRepository,
    });
    expect(providers).toContainEqual({
      provide: POKE_LOUNGE_ROOM_EVENT_PUBLISHER,
      useExisting: PokeLoungeRoomEventsService,
    });
  });
});
