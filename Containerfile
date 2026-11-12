# Containerfile for Podman (replaces Dockerfile)
# Multi-stage build for Blue Screen of App with Deno

# Deno 1.46.3 (matches CI's v1.x): the tests import jsr:@std/assert, which
# 1.39.1 cannot resolve. Pinned by digest; the tag is for readers.
ARG DENO_IMAGE=docker.io/denoland/deno:alpine-1.46.3@sha256:25bd4946f68c643ba7ce2428a13673ea5fd7123fd868ee36caa60e76607ce0d5

# Stage 1: Builder
FROM ${DENO_IMAGE} AS builder

WORKDIR /app

# There is no deno.json; deno.lock is optional.
COPY deno.lock* ./

# Copy source, runtime config and tests
COPY src/ ./src/
COPY config.json ./
COPY tests/ ./tests/

# Cache dependencies
RUN deno cache src/server.js

# Run tests
RUN deno test --allow-net --allow-read --allow-env

# Stage 2: Runtime
FROM ${DENO_IMAGE}

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S denouser && \
    adduser -S denouser -u 1001 -G denouser

WORKDIR /app

# Copy the application from the builder (tests stay in the builder stage)
COPY --from=builder --chown=denouser:denouser /app/src ./src
COPY --from=builder --chown=denouser:denouser /app/config.json ./

# Copy additional files
COPY --chown=denouser:denouser LICENSES/ ./LICENSES/

# Create logs directory
RUN mkdir -p logs && chown denouser:denouser logs

# Switch to non-root user
USER denouser

# Expose privileged port 443 (requires --cap-add=NET_BIND_SERVICE or rootless)
EXPOSE 443

# Health check against the server's own /api/health route (plain HTTP)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD deno eval "const r = await fetch('http://127.0.0.1:443/api/health'); if (!r.ok) Deno.exit(1);" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "src/server.js"]
