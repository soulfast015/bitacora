FROM node:20-alpine AS base

# --- Dependencies ---
FROM base AS deps
# build tools needed to compile the better-sqlite3 native module on Alpine (musl)
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- Production ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# SQLite database lives on a mounted volume so data survives container rebuilds
ENV DATABASE_URL="file:/app/data/prod.db"

# Copy standalone build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy prisma files for db push + seed
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy entrypoint
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# data/ holds the SQLite file, logs/ holds the seed marker; both owned by node
RUN mkdir -p /app/data /app/logs && chown -R node:node /app

USER node

EXPOSE 3000

VOLUME ["/app/data"]

CMD ["./docker-entrypoint.sh"]
