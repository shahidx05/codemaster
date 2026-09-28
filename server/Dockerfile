# =============================================================================
# Stage 1 — builder
#   Installs ALL dependencies (including devDependencies) so that any future
#   build step (transpilation, asset generation, etc.) can run here without
#   polluting the final image.
# =============================================================================
FROM node:22.17.0-alpine3.22 AS builder

# Set working directory
WORKDIR /app

# Copy manifest files first to leverage Docker layer-cache on npm install
COPY package.json package-lock.json ./

# Install all deps (prod + dev) with a clean, reproducible install
RUN npm ci

# Copy the rest of the source
COPY . .

# =============================================================================
# Stage 2 — production
#   Starts from a clean Alpine image, copies only the production artefacts,
#   and runs the app as a dedicated non-root user.
# =============================================================================
FROM node:22.17.0-alpine3.22 AS production

# Install dumb-init for proper PID 1 signal handling
RUN apk add --no-cache dumb-init

# Create a non-root user/group with no login shell and no home dir
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy manifest files
COPY package.json package-lock.json ./

# Install ONLY production dependencies (skip devDependencies)
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source from builder
COPY --from=builder /app/server.js    ./server.js
COPY --from=builder /app/config       ./config
COPY --from=builder /app/controllers  ./controllers
COPY --from=builder /app/middleware   ./middleware
COPY --from=builder /app/models       ./models
COPY --from=builder /app/routes       ./routes
COPY --from=builder /app/utils        ./utils

# Transfer ownership of the working directory to the non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose the port the app listens on (default 5000, overridable via PORT env)
EXPOSE 5000

# HEALTHCHECK — hits the existing GET / route every 30 s.
# Starts after 15 s (lets server connect to MongoDB). Fails after 3 retries.
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 CMD wget -qO- http://localhost:5000/ | grep -q "CodeMaster API" || exit 1

# Secrets (MONGODB_URI, JWT_SECRET, etc.) must be supplied at runtime via
# --env-file or -e flags. They are intentionally NOT set here.
ENV NODE_ENV=production

# Use dumb-init as PID 1 to forward signals correctly to Node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]