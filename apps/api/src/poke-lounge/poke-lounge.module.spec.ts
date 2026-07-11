import { PokeLoungeRoomEventsService } from './poke-lounge-room-events.service';
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
    expect(providers).toContainEqual({
      provide: POKE_LOUNGE_ROOM_EVENT_PUBLISHER,
      useExisting: PokeLoungeRoomEventsService,
    });
  });
});
