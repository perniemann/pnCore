# Docker — Code Patterns Reference

Full Dockerfile examples, compose.yaml, and CI config. For decisions, security rules, and image targets, see [SKILL.md](SKILL.md).

---

## Dockerfile: multi-stage Node.js

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 appuser
USER appuser
ENV NODE_ENV=production
COPY --from=deps  --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=appuser:nodejs /app/dist         ./dist
COPY --from=build --chown=appuser:nodejs /app/package.json ./
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
```

---

## Dockerfile: multi-stage Next.js

```dockerfile
FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs
COPY --from=builder /app/public                            ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

> Requires `output: "standalone"` in `next.config.ts`.

---

## .dockerignore

```
node_modules
.next
.git
# local env / secrets (use your project's env template filenames)
env.example
env.local
env.*.local
dist
coverage
*.log
README.md
.DS_Store
```

---

## Layer caching: correct pattern

```dockerfile
# GOOD — deps layer only invalidates when package.json changes
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# BAD — cache-busting: reinstalls deps on every source change
COPY . .
RUN npm ci
```

---

## compose.yaml (local development)

```yaml
services:
  app:
    build:
      context: .
      target: build
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://dev:dev@db:5432/myapp
      REDIS_URL: redis://redis:6379
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: myapp
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev"]
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --save 60 1 --loglevel warning

volumes:
  pgdata:
```

```bash
docker compose up -d          # start services in background
docker compose logs -f app    # follow app logs
docker compose exec app sh    # shell into running container
docker compose down -v        # stop and remove volumes
```

---

## CI integration

```yaml
# GitHub Actions
- name: Build and scan image
  run: |
    docker build -t myapp:${{ github.sha }} .
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
      aquasec/trivy image --exit-code 1 --severity CRITICAL myapp:${{ github.sha }}

- name: Push to registry
  run: |
    echo "${{ secrets.REGISTRY_PASSWORD }}" | docker login -u ${{ secrets.REGISTRY_USER }} --password-stdin
    docker tag myapp:${{ github.sha }} registry.example.com/myapp:${{ github.sha }}
    docker push registry.example.com/myapp:${{ github.sha }}
```
