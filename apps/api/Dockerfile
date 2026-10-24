FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.25.0 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types ./packages/types
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @medcore/types build
RUN pnpm --filter @medcore/api build

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
