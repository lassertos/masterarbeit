FROM node:lts-bookworm

WORKDIR /tmp
RUN apt update
RUN apt install -y libelf-dev avr-libc libglut-dev
RUN git clone https://github.com/buserror/simavr.git
WORKDIR /tmp/simavr
RUN make install
RUN ldconfig

WORKDIR /app

COPY dist ./dist
COPY package.json ./package.json
COPY package-lock.json ./package-lock.json

RUN npm ci --omit=dev

ENV NODE_ENV=production

CMD ["node", "dist/index.mjs"]