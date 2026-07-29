# syntax=docker/dockerfile:1

FROM node:24-trixie-slim AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci


FROM node:24-trixie-slim AS build

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN npm prune --omit=dev


FROM node:24-trixie-slim AS production

ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends dumb-init \
    && rm -rf /var/lib/apt/lists/*

COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/src ./src
COPY --chown=node:node --from=build /app/scripts ./scripts


USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT || 5000}/health`).then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"]

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "src/main.js"]
