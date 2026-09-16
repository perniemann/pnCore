---
name: pn-docker
description: "Docker best practices for production containers. Multi-stage builds, non-root user, .dockerignore, layer caching, compose.yaml for local dev, and container security scanning. Use when writing or reviewing Dockerfiles or local development container setups."
---

# Docker

## When to use

- Writing or reviewing a `Dockerfile` for a Node.js, Python, Go, or other service
- Setting up `compose.yaml` for local development (databases, Redis, message queues)
- Optimising image size, build speed, or layer caching
- Hardening a container: non-root user, read-only filesystem, security scanning
- Integrating Docker builds into CI/CD pipelines

For full Dockerfile examples, compose.yaml, and CI config, see [reference.md](reference.md).

## Key rules

**Multi-stage builds:** Use at least two stages (deps/build → runner). Final stage uses `alpine` or `distroless` and a non-root user.

**Layer caching:** Copy dependency manifests first, install, then copy source code. Never `COPY . . && RUN npm ci` — invalidates cache on every source change.

**.dockerignore:** Always include — omitting it copies `node_modules` into the build context, slowing every build. Minimum: `node_modules`, `.next`, `.git`, local env/secret patterns (see `reference.md`), `dist`, `coverage`.

**compose.yaml:** Use `target: build` for local dev with volume mounts for live reload. Use `service_healthy` depends_on for databases.

## Security hardening

| Practice | Why |
|---|---|
| Non-root user (`USER appuser`) | Limits blast radius of container escape |
| Read-only root filesystem | `docker run --read-only --tmpfs /tmp` |
| No `privileged: true` | Never in production |
| Pin base image versions | `node:22.11.0-alpine` not `node:alpine` |
| Scan with Trivy | `trivy image myapp:latest` in CI |
| No secrets in `ENV` or `ARG` | Use runtime secrets: Vault, AWS Secrets Manager |
| Minimal base image | `alpine` or `distroless` to reduce attack surface |

## Image size targets

| Stack | Target compressed size |
|---|---|
| Node.js API (alpine) | < 150 MB |
| Next.js (standalone, alpine) | < 200 MB |
| Python FastAPI (slim) | < 120 MB |
| Go (scratch/distroless) | < 30 MB |

## Guardrails

- Reference `pn-devops-automation` for full CI/CD pipeline patterns.
- Reference `pn-observability` for `HEALTHCHECK` endpoint implementation.
- Reference `pn-monorepo` for multi-service monorepo Docker build strategies.
- Never use `latest` tag in production manifests; always pin to a SHA or semver.
