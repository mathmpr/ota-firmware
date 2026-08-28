FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN chmod +x docker-entrypoint.sh \
  && mkdir -p /data /app/storage/firmwares

ENV NODE_ENV=production \
  DATABASE_PATH=/data/dev.sqlite3 \
  FIRMWARE_STORAGE_PATH=/data/firmwares \
  TZ=America/Sao_Paulo

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "main.js"]
