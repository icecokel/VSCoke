import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { PokeLoungeRoomCommand } from '../../src/poke-lounge/entities/poke-lounge-room-command.entity';
import { PokeLoungeRoom } from '../../src/poke-lounge/entities/poke-lounge-room.entity';
import { requireTestDatabaseUrl } from '../../src/test-data-source';

const testDatabaseUrl = requireTestDatabaseUrl();

export function getPokeLoungeTestTypeOrmOptions(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: testDatabaseUrl,
    entities: [PokeLoungeRoom, PokeLoungeRoomCommand],
    synchronize: false,
  };
}

export function createPokeLoungeTestDataSource(): DataSource {
  const options: DataSourceOptions = {
    type: 'postgres',
    url: testDatabaseUrl,
    entities: [PokeLoungeRoom, PokeLoungeRoomCommand],
    synchronize: false,
  };

  return new DataSource(options);
}

export async function truncatePokeLoungeRoomStorage(
  dataSource: DataSource,
): Promise<void> {
  await dataSource.query(
    'TRUNCATE TABLE "poke_lounge_room_command", "poke_lounge_room" RESTART IDENTITY CASCADE',
  );
}
