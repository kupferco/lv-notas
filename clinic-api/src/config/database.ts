import pkg, { PoolConfig } from 'pg';
const { Pool } = pkg;

const poolConfig = {
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  socketPath: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
} as unknown as PoolConfig;

const pool = new Pool(poolConfig);

export default pool;