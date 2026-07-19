const { Pool } = require('pg');

// DATABASE_URL should be set in the environment (.env locally, or Fly.io secrets in production).
// If it's not set, `pool` will be null and the app falls back to reading cars.json instead
// (see routes/cars.js) so local development still works without a database.

let pool = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Most hosted Postgres providers (Fly.io, Neon, etc.) require SSL.
    // This setting works for both local (no SSL needed) and hosted (SSL required) connections.
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });
} else {
  console.warn('WheelRev backend: DATABASE_URL not set — using cars.json instead of a real database.');
}

module.exports = pool;
