import pkg from "pg";
const { Pool } = pkg;

const isCloudRun = process.env.K_SERVICE !== undefined;

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  
  // Conditional host configuration
  host: isCloudRun 
    ? process.env.POSTGRES_HOST  // Will use /cloudsql/INSTANCE_CONNECTION_NAME
    : "localhost",               // For local development
    
  // Required for Cloud SQL
  ...(isCloudRun && {
    socketPath: process.env.POSTGRES_HOST
  })
});

export default pool;
