FROM node:lts-bookworm AS build

WORKDIR /tmp/build

RUN apt update
RUN apt install -y build-essential g++ libx11-dev libxkbfile-dev libsecret-1-dev libkrb5-dev python-is-python3
RUN git clone https://github.com/microsoft/vscode.git -b 1.93.0

WORKDIR /tmp/build/vscode

RUN yarn
RUN yarn gulp vscode-web-min

FROM nginx

COPY --from=build /tmp/build/vscode /tmp/vscode
COPY public /usr/share/nginx/html
COPY --from=build /tmp/build/vscode-web /usr/share/nginx/html/vscode-web
COPY default.conf.template /etc/nginx/templates/