const { Client } = require('pg');
require('dotenv').config();

async function dropTable() {
  const client = new Client({
    host: 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    await client.connect();
    console.log('Dropping table game_rank...');
    await client.query('DROP TABLE IF EXISTS game_rank');
    console.log('Success: game_rank dropped.');

    // Check remaining tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(
      'Remaining Tables:',
      res.rows.map((r) => r.table_name),
    );
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

dropTable();
