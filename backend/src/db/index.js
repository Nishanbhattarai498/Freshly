import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is missing in environment variables");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

const ensureSchemaCompat = async () => {
  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS expo_push_token text
    `);
    console.log('✅ Database compatibility check completed');
  } catch (error) {
    console.error('❌ Failed to ensure database compatibility:', error);
  }
};

void ensureSchemaCompat();

export const db = drizzle(pool, { schema });
