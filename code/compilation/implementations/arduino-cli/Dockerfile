FROM node:lts-alpine

RUN apk add curl libc6-compat
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh
RUN arduino-cli core install arduino:avr

WORKDIR /app

COPY dist ./dist
COPY package.json ./package.json
COPY package-lock.json ./package-lock.json

RUN npm ci --omit=dev

ENV NODE_ENV=production

CMD ["node", "dist/index.mjs"]