FROM node:20-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

RUN addgroup -g 1001 appuser \
  && adduser -D -H -u 1001 -G appuser appuser

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev \
  && npm cache clean --force

COPY src ./src
COPY scripts ./scripts
COPY docker/entrypoint.js /app/docker/entrypoint.js

RUN mkdir -p /app/data \
  && chown -R appuser:appuser /app

USER appuser

ENV NODE_ENV=production \
  PORT=3000 \
  CSV_PATH=/app/data/rows.csv

EXPOSE 3000

# First boot may generate a large CSV before the server listens; adjust if needed.
HEALTHCHECK --interval=30s --timeout=5s --start-period=300s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/health',(r)=>{r.resume();r.on('end',()=>process.exit(r.statusCode===200?0:1));}).on('error',()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/dumb-init", "--", "node", "/app/docker/entrypoint.js"]
