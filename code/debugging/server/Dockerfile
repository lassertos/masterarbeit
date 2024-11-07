FROM node:lts-bookworm AS build

RUN apt update && apt install -y curl wget make mingw-w64 gcc g++ bzip2 xz-utils autoconf texinfo libgmp-dev libmpfr-dev python3 python-is-python3 python3-dev

WORKDIR /tmp
RUN git clone https://github.com/ZakKemble/avr-gcc-build.git
WORKDIR /tmp/avr-gcc-build
RUN git reset --hard 4207f73
COPY patches/gdb-with-python.patch /tmp/avr-gcc-build/
RUN git apply gdb-with-python.patch
RUN FOR_WINX64=0 bash avr-gcc-build.sh
RUN cp permissions.sh build/avr-gcc-14.1.0-x64-linux
WORKDIR /tmp/avr-gcc-build/build/avr-gcc-14.1.0-x64-linux
ENV USER=root
RUN bash permissions.sh

FROM node:lts-bookworm

RUN apt update && apt install -y python3 python3-dev curl
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh
RUN arduino-cli core install arduino:avr

COPY --from=build /tmp/avr-gcc-build/build/avr-gcc-14.1.0-x64-linux/avr /usr/local/lib
COPY --from=build /tmp/avr-gcc-build/build/avr-gcc-14.1.0-x64-linux/bin/. /usr/local/bin
COPY --from=build /tmp/avr-gcc-build/build/avr-gcc-14.1.0-x64-linux/include/. /usr/local/include
COPY --from=build /tmp/avr-gcc-build/build/avr-gcc-14.1.0-x64-linux/lib/. /usr/local/lib
COPY --from=build /tmp/avr-gcc-build/build/avr-gcc-14.1.0-x64-linux/libexec/. /usr/local/libexec
COPY --from=build /tmp/avr-gcc-build/build/avr-gcc-14.1.0-x64-linux/share/. /usr/local/share
RUN ldconfig

WORKDIR /app

COPY dist ./dist
COPY package.json ./package.json
COPY package-lock.json ./package-lock.json

RUN npm ci --omit=dev

ENV NODE_ENV=production

CMD ["node", "dist/index.mjs"]