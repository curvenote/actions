FROM node:24-bookworm-slim AS base

ARG CURVENOTE_VERSION=latest

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g "curvenote@${CURVENOTE_VERSION}"

WORKDIR /github/workspace

# CLI only — used when typst and images inputs are both false.
FROM base AS slim

# Full toolchain — Typst, fonts, and image conversion tools.
FROM base AS full

ARG TYPST_VERSION=latest

RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-noto \
    ghostscript \
    imagemagick \
    inkscape \
    webp \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Allow PDF -> PNG conversions via ImageMagick.
RUN sed -i '/domain="coder" rights="none"/d' /etc/ImageMagick-6/policy.xml

COPY docker/install-typst.sh /tmp/install-typst.sh
RUN chmod +x /tmp/install-typst.sh \
    && TYPST_VERSION="${TYPST_VERSION}" /tmp/install-typst.sh \
    && rm /tmp/install-typst.sh
