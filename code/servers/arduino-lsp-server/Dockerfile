FROM node:latest

# install clangd
RUN apt update
RUN apt install -y clangd-14
RUN update-alternatives --install /usr/bin/clangd clangd /usr/bin/clangd-14 100

# install arduino-cli
RUN mkdir /app
RUN mkdir /app/arduino-cli
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=/bin sh
RUN arduino-cli core install arduino:avr

# install go
RUN wget https://go.dev/dl/go1.22.6.linux-amd64.tar.gz
RUN rm -rf /usr/local/go && tar -C /usr/local -xzf go1.22.6.linux-amd64.tar.gz
ENV PATH="$PATH:/usr/local/go/bin"

# install arduino language server
RUN git clone https://github.com/arduino/arduino-language-server.git /app/arduino-language-server
WORKDIR /app/arduino-language-server
RUN go build

# install language server provider
ADD . /app/language-server-provider
WORKDIR /app/language-server-provider
RUN npm ci
RUN npm run build

EXPOSE 3010

ENTRYPOINT [ "npm", "start" ]