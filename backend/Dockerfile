FROM node:20-alpine AS builder

WORKDIR /app

# Build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production image ──────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

RUN mkdir -p /data
ENV SOUNDVZN_DATA_DIR=/data

CMD ["node", "dist/index.js"]
