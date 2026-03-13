const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, done) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Connected to Supabase PostgreSQL');
    done();
  }
});

module.exports = pool;