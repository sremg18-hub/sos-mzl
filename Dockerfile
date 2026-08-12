# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV PORT=3000
RUN addgroup -S app && adduser -S app -G app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
COPY --from=build /app/build ./build
ENV NODE_ENV=production
RUN chown -R app:app /app
USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/login >/dev/null 2>&1 || exit 1

CMD ["sh", "-c", "npx drizzle-kit migrate && npx tsx src/lib/server/db/seed.ts && node build"]
