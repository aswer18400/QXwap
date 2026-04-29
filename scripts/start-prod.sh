#!/bin/bash
# start-prod.sh - Production startup script
# Runs migrations then starts the server

echo "[QXwap] Starting production server..."

# Run database migrations
echo "[QXwap] Running database migrations..."
npx drizzle-kit push --force

# Seed data if needed (only if no users exist)
echo "[QXwap] Checking if seed is needed..."
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT COUNT(*) FROM users').then(r => {
  const count = parseInt(r.rows[0].count);
  if (count === 0) {
    console.log('[QXwap] No users found, seeding...');
    process.exit(1); // trigger seed
  }
  console.log('[QXwap] Database has ' + count + ' users, skipping seed.');
  process.exit(0);
}).catch(() => {
  console.log('[QXwap] Tables may not exist yet, seed will run after migration.');
  process.exit(0);
});
"

if [ $? -ne 0 ]; then
  echo "[QXwap] Seeding database..."
  npx tsx db/seed.ts
fi

# Start server
echo "[QXwap] Starting server on port ${PORT:-3000}..."
node dist/boot.js
