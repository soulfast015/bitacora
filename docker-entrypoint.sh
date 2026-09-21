#!/bin/sh
set -e

# Ensure the SQLite data directory exists (mounted volume)
mkdir -p /app/data /app/logs

echo "🗃️ Pushing database schema..."
npx prisma db push --skip-generate

if [ ! -f "/app/data/.seeded" ]; then
  echo "🌱 Running seed..."
  npx tsx prisma/seed.ts
  touch /app/data/.seeded
  echo "✅ Seed complete"
fi

echo "🚀 Starting server..."
exec node server.js
