# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

FROM base AS manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json

FROM manifests AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends g++ make python3 \
  && rm -rf /var/lib/apt/lists/*
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM manifests AS prod-deps
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/prisma.config.ts
ENV DATABASE_URL="postgresql://quill_user:quill_password@postgres:5432/quill_db?schema=public"
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile
RUN pnpm --filter @quill-collab/api prisma:generate

FROM deps AS build
COPY . .
ENV DATABASE_URL="postgresql://quill_user:quill_password@postgres:5432/quill_db?schema=public"
RUN pnpm --filter @quill-collab/api prisma:generate
RUN pnpm --filter @quill-collab/api build

FROM base AS runner
ENV NODE_ENV=production
ENV API_PORT=4000
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nestjs

COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma
COPY --from=prod-deps --chown=nestjs:nodejs /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=build --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=build --chown=nestjs:nodejs /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build --chown=nestjs:nodejs /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

USER nestjs
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main"]
