# =============================================================================
# Stage 1 — builder
#   Installs all dependencies and runs `vite build` to produce the static dist/
# =============================================================================
FROM node:22.17.0-alpine3.22 AS builder

WORKDIR /app

# Copy manifests first to exploit layer caching
COPY package.json package-lock.json ./

# Install all deps (vite, tailwindcss plugin, etc. are devDependencies)
RUN npm ci

# Copy application source
COPY . .

# Build the production bundle — output lands in /app/dist
RUN npm run build

# =============================================================================
# Stage 2 — production (nginx)
#   Copies only the compiled static files; no Node, no source, no node_modules.
#   Final image is ~45 MB.
# =============================================================================
FROM nginx:1.27.5-alpine3.21 AS production

# Remove the default nginx config and replace with our SPA-aware one
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copy the Vite build output from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx:alpine already runs as root to bind port 80, but the worker processes
# drop to the `nginx` user (uid 101) automatically — no extra USER instruction needed.

EXPOSE 80

# HEALTHCHECK — hits the dedicated /health route served by nginx (200 = healthy)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO /dev/null http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]