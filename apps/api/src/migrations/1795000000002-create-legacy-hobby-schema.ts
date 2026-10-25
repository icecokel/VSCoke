import type { MigrationInterface, QueryRunner } from 'typeorm';

// Ubuntu 운영 DB에서 synchronize로 만들어졌던 hobby table(espresso, recipe, word)을
// 새 DB에서도 같은 모양으로 만든다. 운영에서 이미 있으면 그대로 채택한다.
export class CreateLegacyHobbySchema1795000000002 implements MigrationInterface {
  name = 'CreateLegacyHobbySchema1795000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        hobby_object_count integer;
      BEGIN
        SELECT
          (CASE WHEN pg_catalog.to_regclass('public.espresso_bean') IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN pg_catalog.to_regclass('public.espresso_history') IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN pg_catalog.to_regclass('public.espresso_round') IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN pg_catalog.to_regclass('public.recipe') IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN pg_catalog.to_regclass('public.word') IS NOT NULL THEN 1 ELSE 0 END)
        INTO hobby_object_count;

        IF hobby_object_count = 5 THEN
          RETURN;
        END IF;

        IF hobby_object_count <> 0 THEN
          RAISE EXCEPTION
            'Legacy hobby schema is partial: expected espresso_bean, espresso_history, espresso_round, recipe, and word to be all absent or all present';
        END IF;

        CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;

        CREATE TABLE public.espresso_bean (
          "id" varchar PRIMARY KEY,
          "name" varchar NOT NULL,
          "roaster" varchar,
          "goals" jsonb NOT NULL,
          "defaultEquipment" jsonb NOT NULL,
          "createdAt" timestamp NOT NULL DEFAULT pg_catalog.now(),
          "updatedAt" timestamp NOT NULL DEFAULT pg_catalog.now()
        );

        CREATE TABLE public.espresso_history (
          "id" varchar PRIMARY KEY,
          "beanId" varchar NOT NULL,
          "title" varchar NOT NULL,
          "currentAnalysis" jsonb,
          "adjustmentGuide" jsonb,
          "finalHypothesis" jsonb,
          "nextTest" jsonb,
          "nextDirection" jsonb,
          "createdAt" timestamp NOT NULL DEFAULT pg_catalog.now(),
          "updatedAt" timestamp NOT NULL DEFAULT pg_catalog.now(),
          CONSTRAINT "FK_espresso_history_bean_id"
            FOREIGN KEY ("beanId") REFERENCES public.espresso_bean ("id")
            ON DELETE CASCADE
        );

        CREATE TABLE public.espresso_round (
          "id" varchar PRIMARY KEY,
          "historyId" varchar NOT NULL,
          "roundNumber" integer NOT NULL,
          "date" date,
          "recipe" jsonb NOT NULL,
          "result" jsonb NOT NULL,
          "analysis" jsonb,
          "nextActions" jsonb NOT NULL,
          "createdAt" timestamp NOT NULL DEFAULT pg_catalog.now(),
          "updatedAt" timestamp NOT NULL DEFAULT pg_catalog.now(),
          CONSTRAINT "FK_espresso_round_history_id"
            FOREIGN KEY ("historyId") REFERENCES public.espresso_history ("id")
            ON DELETE CASCADE
        );

        CREATE TABLE public.recipe (
          "id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
          "name" varchar NOT NULL,
          "tags" jsonb NOT NULL,
          "ingredients" jsonb NOT NULL,
          "steps" jsonb NOT NULL,
          "source" jsonb,
          "createdAt" timestamp NOT NULL DEFAULT pg_catalog.now(),
          "updatedAt" timestamp NOT NULL DEFAULT pg_catalog.now()
        );

        CREATE TABLE public.word (
          "id" serial PRIMARY KEY,
          "word" varchar(5) NOT NULL,
          "createdAt" timestamp NOT NULL DEFAULT pg_catalog.now(),
          CONSTRAINT "UQ_word_word" UNIQUE ("word")
        );
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        RAISE EXCEPTION 'Legacy hobby baseline is irreversible because it may have adopted existing production objects and data';
      END $$;
    `);
  }
}
