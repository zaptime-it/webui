FROM node:24-bookworm

WORKDIR /usr/src/app

RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

RUN apt-get update && \
    apt-get install -y git-core build-essential python3 && \
    apt-get clean autoclean && \
    rm -rf /var/lib/{apt,dpkg,cache,log}/

RUN git clone https://github.com/earlephilhower/mklittlefs.git /usr/src/mklittlefs && \
    cd /usr/src/mklittlefs && \
    git submodule update --init && \
    make dist && cp /usr/src/mklittlefs/mklittlefs /usr/local/bin

RUN pnpm install --frozen-lockfile
