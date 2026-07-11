import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PokeLoungeRoomCommand } from './entities/poke-lounge-room-command.entity';
import { PokeLoungeRoom } from './entities/poke-lounge-room.entity';
import { PostgresPokeLoungeRoomRepository } from './postgres-poke-lounge-room.repository';
import { PokeLoungeRoomEventsService } from './poke-lounge-room-events.service';
import { POKE_LOUNGE_ROOM_EVENT_PUBLISHER } from './poke-lounge-room-event.publisher';
import { POKE_LOUNGE_ROOM_REPOSITORY } from './poke-lounge-room.repository';
import { PokeLoungeGateway } from './poke-lounge.gateway';
import { PokeLoungeController } from './poke-lounge.controller';
import { PokeLoungeRoomService } from './poke-lounge-room.service';

@Module({
  imports: [TypeOrmModule.forFeature([PokeLoungeRoom, PokeLoungeRoomCommand])],
  controllers: [PokeLoungeController],
  providers: [
    PostgresPokeLoungeRoomRepository,
    {
      provide: POKE_LOUNGE_ROOM_REPOSITORY,
      useExisting: PostgresPokeLoungeRoomRepository,
    },
    PokeLoungeRoomEventsService,
    {
      provide: POKE_LOUNGE_ROOM_EVENT_PUBLISHER,
      useExisting: PokeLoungeRoomEventsService,
    },
    PokeLoungeRoomService,
    PokeLoungeGateway,
  ],
  exports: [PokeLoungeRoomService],
})
export class PokeLoungeModule {}
