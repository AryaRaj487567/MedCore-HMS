FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.25.0 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types ./packages/types
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @medcore/types build
RUN pnpm --filter @medcore/web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@medcore/web", "start"]
