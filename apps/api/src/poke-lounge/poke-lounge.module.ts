import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CompetitiveMatchService } from './competitive/competitive-match.service';
import { COMPETITIVE_MATCH_REPOSITORY } from './competitive/competitive-match.repository';
import { PostgresCompetitiveMatchRepository } from './competitive/postgres-competitive-match.repository';
import { PokeLoungeCompetitiveMatch } from './entities/poke-lounge-competitive-match.entity';
import { PokeLoungeCompetitiveSeat } from './entities/poke-lounge-competitive-seat.entity';
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
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      PokeLoungeRoom,
      PokeLoungeRoomCommand,
      PokeLoungeCompetitiveSeat,
      PokeLoungeCompetitiveMatch,
    ]),
  ],
  controllers: [PokeLoungeController],
  providers: [
    PostgresPokeLoungeRoomRepository,
    PostgresCompetitiveMatchRepository,
    {
      provide: COMPETITIVE_MATCH_REPOSITORY,
      useExisting: PostgresCompetitiveMatchRepository,
    },
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
    CompetitiveMatchService,
    PokeLoungeGateway,
  ],
  exports: [PokeLoungeRoomService],
})
export class PokeLoungeModule {}
