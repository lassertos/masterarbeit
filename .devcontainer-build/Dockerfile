FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04

COPY buildsystem /home/vscode/buildsystem

ENV TINI_VERSION v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]