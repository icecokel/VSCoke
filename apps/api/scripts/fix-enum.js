const { Client } = require('pg');
require('dotenv').config();

async function fixEnum() {
  const client = new Client({
    host: 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    await client.connect();
    console.log('DB 연결 성공');

    // BLOCK_TOWER 값이 있는 레코드 삭제
    console.log('BLOCK_TOWER 게임 기록 삭제 중...');
    await client.query(
      `DELETE FROM game_history WHERE "gameType" = 'BLOCK_TOWER'`,
    );
    console.log('BLOCK_TOWER 기록 삭제 완료');

    // enum 타입 재생성
    console.log('game_history_gametype_enum 재생성 중...');

    // 1. 임시 컬럼 생성
    await client.query(
      `ALTER TABLE game_history ADD COLUMN gametype_temp VARCHAR(50)`,
    );

    // 2. 데이터 복사
    await client.query(
      `UPDATE game_history SET gametype_temp = "gameType"::text`,
    );

    // 3. 기존 컬럼 삭제
    await client.query(`ALTER TABLE game_history DROP COLUMN "gameType"`);

    // 4. 기존 enum 삭제
    await client.query(`DROP TYPE IF EXISTS game_history_gametype_enum`);

    // 5. 새 enum 생성 (SKY_DROP만)
    await client.query(
      `CREATE TYPE game_history_gametype_enum AS ENUM ('SKY_DROP')`,
    );

    // 6. 새 컬럼 생성
    await client.query(
      `ALTER TABLE game_history ADD COLUMN "gameType" game_history_gametype_enum DEFAULT 'SKY_DROP'`,
    );

    // 7. 데이터 복원
    await client.query(
      `UPDATE game_history SET "gameType" = gametype_temp::game_history_gametype_enum`,
    );

    // 8. 임시 컬럼 삭제
    await client.query(`ALTER TABLE game_history DROP COLUMN gametype_temp`);

    console.log('enum 재생성 완료');

    // 테이블 확인
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(
      '현재 테이블:',
      res.rows.map((r) => r.table_name),
    );
  } catch (err) {
    console.error('오류:', err);
  } finally {
    await client.end();
  }
}

fixEnum();
