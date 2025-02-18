
import pool from '../src/config/database.js';

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL');
    await client.release();
  } catch (err) {
    console.error('Error connecting to PostgreSQL:', err);
  } finally {
    await pool.end();
  }
}

testConnection();
