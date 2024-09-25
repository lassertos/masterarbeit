FROM node:lts-alpine AS build

WORKDIR /tmp/build

COPY . .

RUN npm ci
RUN npm run build

FROM node:lts-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm ci --omit=dev

COPY --from=build /tmp/build/dist ./dist

CMD [ "node", "dist/index.mjs" ]