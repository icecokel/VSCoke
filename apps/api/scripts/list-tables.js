const { Client } = require('pg');
require('dotenv').config();

async function listTables() {
  const client = new Client({
    host: 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USERNAME, // .env 확인 필요
    password: process.env.DB_PASSWORD, // .env 확인 필요
    database: process.env.DB_DATABASE, // .env 확인 필요
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(
      'Tables:',
      res.rows.map((r) => r.table_name),
    );
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

listTables();
