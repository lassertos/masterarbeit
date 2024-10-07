FROM node:lts-bookworm AS build

WORKDIR /tmp/build

RUN apt update
RUN apt install -y build-essential g++ libx11-dev libxkbfile-dev libsecret-1-dev libkrb5-dev python-is-python3
RUN git clone https://github.com/microsoft/vscode.git -b 1.93.0

WORKDIR /tmp/build/vscode

RUN yarn
RUN yarn gulp vscode-web-min

FROM node:lts-bookworm

ENV NODE_ENV=production

WORKDIR /app

COPY dist ./dist
COPY package.json .
COPY package-lock.json .
COPY public ./public

RUN npm ci --omit=dev

COPY --from=build /tmp/build/vscode-web ./public/vscode-web

ENTRYPOINT [ "node", "dist/index.mjs" ]