FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

FROM base AS dependencies

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Route modules validate this variable while Next.js collects route metadata.
# This non-routable build-time value is never copied into the runtime image.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN pnpm build

# Contains Drizzle Kit and the SQL migrations for the one-shot Compose service.
FROM dependencies AS migrator

WORKDIR /app
COPY . .

CMD ["pnpm", "db:migrate"]

FROM base AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
