FROM node:lts-alpine

WORKDIR /app

COPY dist ./dist
COPY package.json ./package.json
COPY package-lock.json ./package-lock.json

RUN npm ci --omit=dev

ENV NODE_ENV=production

CMD ["node", "dist/index.mjs"]