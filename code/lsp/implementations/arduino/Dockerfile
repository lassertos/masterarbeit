FROM node:lts

ARG TARGETARCH

RUN apt update && apt install -y curl clangd-14
RUN wget https://go.dev/dl/go1.23.2.linux-${TARGETARCH}.tar.gz
RUN rm -rf /usr/local/go && tar -C /usr/local -xzf go1.23.2.linux-${TARGETARCH}.tar.gz
ENV PATH="$PATH:/usr/local/go/bin"
RUN update-alternatives --install /usr/local/bin/clangd clangd /usr/bin/clangd-14 100
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=/usr/local/bin sh
RUN arduino-cli core install arduino:avr
RUN go install github.com/arduino/arduino-language-server@latest
RUN cp  ~/go/bin/arduino-language-server /usr/local/bin/arduino-language-server
RUN arduino-cli config init

WORKDIR /app

COPY dist ./dist
COPY package.json ./package.json
COPY package-lock.json ./package-lock.json

RUN npm ci --omit=dev

ENV NODE_ENV=production

CMD ["node", "dist/index.mjs"]

# arduino-language-server -clangd /usr/local/bin/clangd -cli /usr/local/bin/arduino-cli -cli-config /root/.arduino15/arduino-cli.yaml -fqbn arduino:avr:mega