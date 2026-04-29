# ============================================
# QXwap Production Dockerfile
# ============================================
FROM node:20-slim

WORKDIR /app

# Install build deps + PostgreSQL client
RUN apt-get update && apt-get install -y python3 make g++ postgresql-client && rm -rf /var/lib/apt/lists/*

# Copy package files first (for layer caching)
COPY package.json package-lock.json* ./
COPY tsconfig.json tsconfig.server.json ./
COPY vite.config.ts ./
COPY drizzle.config.ts ./
COPY postcss.config.js tailwind.config.js ./
COPY index.html ./

# Install ALL dependencies (dev needed for build)
RUN npm ci

# Copy source code
COPY src ./src
COPY api ./api
COPY contracts ./contracts
COPY db ./db
COPY public ./public
COPY scripts ./scripts

# Build frontend + backend
RUN npm run build

# Create uploads directory
RUN mkdir -p /app/uploads && chmod 755 /app/uploads

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

# Auto-run migrations on startup then start server
CMD ["bash", "scripts/start-prod.sh"]
