FROM node:latest

RUN apt update
RUN apt install -y avr-libc binutils-avr gcc-avr avrdude make clangd-14
RUN update-alternatives --install /usr/bin/clangd clangd /usr/bin/clangd-14 100

ADD . /app
WORKDIR /app
RUN npm ci
RUN npm run build

EXPOSE 3010

ENTRYPOINT [ "npm", "start" ]