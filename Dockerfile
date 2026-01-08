# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js
RUN npm run build

# Compile worker
RUN npx tsc -p tsconfig.worker.json

# Stage 3: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Install PM2 globally
RUN npm install -g pm2

# Install Claude CLI (may need adjustment based on actual distribution)
# For now, assume it will be available via volume mount or manual installation
# RUN npm install -g @anthropic-ai/claude-code || true

# Install runtime dependencies for native modules
RUN apk add --no-cache python3

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built artifacts
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/ecosystem.config.js ./
COPY --from=builder /app/package.json ./

# Copy node_modules for worker (includes better-sqlite3)
COPY --from=deps /app/node_modules ./node_modules

# Create data directory
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/shootingstar.db

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/status || exit 1

# Run with PM2
USER nextjs
CMD ["pm2-runtime", "ecosystem.config.js"]
