import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLegacyCoreSchema1759999999999 implements MigrationInterface {
  name = 'CreateLegacyCoreSchema1759999999999';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        core_object_count integer;
        schema_matches boolean;
      BEGIN
        SELECT
          (CASE WHEN to_regclass('public."user"') IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN to_regclass('public.game_history') IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN EXISTS (
            SELECT 1
            FROM pg_catalog.pg_type type_record
            JOIN pg_catalog.pg_namespace namespace
              ON namespace.oid = type_record.typnamespace
            WHERE namespace.nspname = 'public'
              AND type_record.typname = 'game_history_gametype_enum'
          ) THEN 1 ELSE 0 END)
        INTO core_object_count;

        IF core_object_count = 0 THEN
          CREATE EXTENSION IF NOT EXISTS "pgcrypto";

          CREATE TABLE "user" (
            "id" varchar PRIMARY KEY,
            "email" varchar NOT NULL,
            "firstName" varchar NOT NULL,
            "lastName" varchar NOT NULL,
            "accessToken" varchar
          );

          CREATE TYPE "game_history_gametype_enum" AS ENUM ('SKY_DROP');

          CREATE TABLE "game_history" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "score" integer NOT NULL,
            "gameType" "game_history_gametype_enum" NOT NULL DEFAULT 'SKY_DROP',
            "playTime" integer,
            "createdAt" timestamp NOT NULL DEFAULT now(),
            "userId" varchar NOT NULL,
            CONSTRAINT "FK_game_history_user_id"
              FOREIGN KEY ("userId") REFERENCES "user" ("id")
              ON DELETE NO ACTION ON UPDATE NO ACTION
          );

          CREATE INDEX "IDX_game_history_user_id"
            ON "game_history" ("userId");

          RETURN;
        END IF;

        IF core_object_count <> 3 THEN
          RAISE EXCEPTION
            'Legacy core schema is partial: expected public.user, public.game_history, and public.game_history_gametype_enum to be all absent or all present';
        END IF;

        SELECT count(*) = 5 AND bool_and(
          CASE column_name
            WHEN 'id' THEN
              data_type = 'character varying' AND udt_schema = 'pg_catalog' AND
              udt_name = 'varchar' AND character_maximum_length IS NULL AND
              is_nullable = 'NO' AND column_default IS NULL
            WHEN 'email' THEN
              data_type = 'character varying' AND udt_schema = 'pg_catalog' AND
              udt_name = 'varchar' AND character_maximum_length IS NULL AND
              is_nullable = 'NO' AND column_default IS NULL
            WHEN 'firstName' THEN
              data_type = 'character varying' AND udt_schema = 'pg_catalog' AND
              udt_name = 'varchar' AND character_maximum_length IS NULL AND
              is_nullable = 'NO' AND column_default IS NULL
            WHEN 'lastName' THEN
              data_type = 'character varying' AND udt_schema = 'pg_catalog' AND
              udt_name = 'varchar' AND character_maximum_length IS NULL AND
              is_nullable = 'NO' AND column_default IS NULL
            WHEN 'accessToken' THEN
              data_type = 'character varying' AND udt_schema = 'pg_catalog' AND
              udt_name = 'varchar' AND character_maximum_length IS NULL AND
              is_nullable = 'YES' AND column_default IS NULL
            ELSE false
          END
        )
        INTO schema_matches
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user';

        IF NOT schema_matches THEN
          RAISE EXCEPTION 'Legacy core schema mismatch: public.user columns, types, nullability, or defaults differ from the canonical schema';
        END IF;

        SELECT count(*) = 6 AND bool_and(
          CASE column_name
            WHEN 'id' THEN
              data_type = 'uuid' AND udt_schema = 'pg_catalog' AND
              udt_name = 'uuid' AND is_nullable = 'NO' AND
              column_default ~ '^(gen_random_uuid|uuid_generate_v4)\\(\\)$'
            WHEN 'score' THEN
              data_type = 'integer' AND udt_schema = 'pg_catalog' AND
              udt_name = 'int4' AND is_nullable = 'NO' AND
              column_default IS NULL
            WHEN 'gameType' THEN
              data_type = 'USER-DEFINED' AND udt_schema = 'public' AND
              udt_name = 'game_history_gametype_enum' AND
              is_nullable = 'NO' AND
              column_default ~ '^''SKY_DROP''::(public\\.)?game_history_gametype_enum$'
            WHEN 'playTime' THEN
              data_type = 'integer' AND udt_schema = 'pg_catalog' AND
              udt_name = 'int4' AND is_nullable = 'YES' AND
              column_default IS NULL
            WHEN 'createdAt' THEN
              data_type = 'timestamp without time zone' AND
              udt_schema = 'pg_catalog' AND udt_name = 'timestamp' AND
              is_nullable = 'NO' AND
              column_default IN ('now()', 'CURRENT_TIMESTAMP')
            WHEN 'userId' THEN
              data_type = 'character varying' AND udt_schema = 'pg_catalog' AND
              udt_name = 'varchar' AND character_maximum_length IS NULL AND
              is_nullable = 'NO' AND column_default IS NULL
            ELSE false
          END
        )
        INTO schema_matches
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'game_history';

        IF NOT schema_matches THEN
          RAISE EXCEPTION 'Legacy core schema mismatch: public.game_history columns, types, nullability, or defaults differ from the canonical schema';
        END IF;

        SELECT count(*) = 1 AND bool_and(
          (
            SELECT array_agg(attribute.attname ORDER BY key.ordinality)
            FROM unnest(constraint_record.conkey)
              WITH ORDINALITY AS key(attnum, ordinality)
            JOIN pg_catalog.pg_attribute attribute
              ON attribute.attrelid = constraint_record.conrelid
              AND attribute.attnum = key.attnum
          ) = ARRAY['id']::name[]
        )
        INTO schema_matches
        FROM pg_catalog.pg_constraint constraint_record
        WHERE constraint_record.conrelid = 'public."user"'::regclass
          AND constraint_record.contype = 'p';

        IF NOT schema_matches THEN
          RAISE EXCEPTION 'Legacy core schema mismatch: public.user must have only id as its primary key';
        END IF;

        SELECT count(*) = 1 AND bool_and(
          (
            SELECT array_agg(attribute.attname ORDER BY key.ordinality)
            FROM unnest(constraint_record.conkey)
              WITH ORDINALITY AS key(attnum, ordinality)
            JOIN pg_catalog.pg_attribute attribute
              ON attribute.attrelid = constraint_record.conrelid
              AND attribute.attnum = key.attnum
          ) = ARRAY['id']::name[]
        )
        INTO schema_matches
        FROM pg_catalog.pg_constraint constraint_record
        WHERE constraint_record.conrelid = 'public.game_history'::regclass
          AND constraint_record.contype = 'p';

        IF NOT schema_matches THEN
          RAISE EXCEPTION 'Legacy core schema mismatch: public.game_history must have only id as its primary key';
        END IF;

        SELECT count(*) = 1 AND bool_and(
          constraint_record.confrelid = 'public."user"'::regclass AND
          constraint_record.confdeltype = 'a' AND
          constraint_record.confupdtype = 'a' AND
          (
            SELECT array_agg(attribute.attname ORDER BY key.ordinality)
            FROM unnest(constraint_record.conkey)
              WITH ORDINALITY AS key(attnum, ordinality)
            JOIN pg_catalog.pg_attribute attribute
              ON attribute.attrelid = constraint_record.conrelid
              AND attribute.attnum = key.attnum
          ) = ARRAY['userId']::name[] AND
          (
            SELECT array_agg(attribute.attname ORDER BY key.ordinality)
            FROM unnest(constraint_record.confkey)
              WITH ORDINALITY AS key(attnum, ordinality)
            JOIN pg_catalog.pg_attribute attribute
              ON attribute.attrelid = constraint_record.confrelid
              AND attribute.attnum = key.attnum
          ) = ARRAY['id']::name[]
        )
        INTO schema_matches
        FROM pg_catalog.pg_constraint constraint_record
        WHERE constraint_record.conrelid = 'public.game_history'::regclass
          AND constraint_record.contype = 'f';

        IF NOT schema_matches THEN
          RAISE EXCEPTION 'Legacy core schema mismatch: public.game_history must have the canonical userId foreign key';
        END IF;

        SELECT array_agg(enum_value.enumlabel::text ORDER BY enum_value.enumsortorder) IN (
          ARRAY['SKY_DROP']::text[],
          ARRAY['SKY_DROP', 'POKE_LOUNGE']::text[]
        )
        INTO schema_matches
        FROM pg_catalog.pg_enum enum_value
        JOIN pg_catalog.pg_type type_record ON type_record.oid = enum_value.enumtypid
        JOIN pg_catalog.pg_namespace namespace ON namespace.oid = type_record.typnamespace
        WHERE namespace.nspname = 'public'
          AND type_record.typname = 'game_history_gametype_enum';

        IF NOT schema_matches THEN
          RAISE EXCEPTION 'Legacy core schema mismatch: public.game_history_gametype_enum must contain SKY_DROP, optionally followed by POKE_LOUNGE';
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        RAISE EXCEPTION 'Legacy core baseline is irreversible because it may have adopted existing production objects and data';
      END $$;
    `);
  }
}
