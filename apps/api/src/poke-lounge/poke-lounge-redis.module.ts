import { Module } from '@nestjs/common';
import { PokeLoungeLiveStateService } from './poke-lounge-live-state.service';

@Module({
  providers: [PokeLoungeLiveStateService],
  exports: [PokeLoungeLiveStateService],
})
export class PokeLoungeRedisModule {}
