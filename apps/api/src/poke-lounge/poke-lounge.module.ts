import { Module } from '@nestjs/common';
import { PokeLoungeController } from './poke-lounge.controller';
import { PokeLoungeRoomService } from './poke-lounge-room.service';

@Module({
  controllers: [PokeLoungeController],
  providers: [PokeLoungeRoomService],
  exports: [PokeLoungeRoomService],
})
export class PokeLoungeModule {}
