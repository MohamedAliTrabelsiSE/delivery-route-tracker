FROM node:22-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/geo/package.json packages/geo/
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
RUN npm ci

COPY packages/geo packages/geo
COPY apps/api apps/api
RUN npm run build -w @tracker/geo && npm run build -w @tracker/api

ENV PORT=3000
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@tracker/api"]
