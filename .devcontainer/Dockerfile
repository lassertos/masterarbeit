FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04

ARG TARGETARCH

COPY buildsystem /home/vscode/buildsystem

ENV TINI_VERSION v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini-${TARGETARCH} /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]