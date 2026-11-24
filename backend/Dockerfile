FROM node:22-bookworm-slim AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS build
WORKDIR /app
COPY package*.json ./
COPY backend/package.json backend/package.json
COPY packages/core/package.json packages/core/package.json
COPY database/prisma/package.json database/prisma/package.json
RUN npm ci
COPY backend backend
COPY packages/core packages/core
COPY database/prisma database/prisma
RUN npm run build --workspace packages/core && npm run generate --workspace database/prisma && npm run build --workspace backend

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --gid 1001 app && useradd --uid 1001 --gid app --shell /bin/bash app
COPY --from=build --chown=app:app /app/backend/dist ./dist
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/packages/core/package.json ./packages/core/package.json
COPY --from=build --chown=app:app /app/packages/core/dist ./packages/core/dist
USER app
EXPOSE 4000
CMD ["node","dist/server.js"]
