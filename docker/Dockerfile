FROM node:20-bookworm

ARG CURVENOTE_VERSION=latest
ARG TYPST_VERSION=0.13.1

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    fonts-noto \
    ghostscript \
    git \
    imagemagick \
    inkscape \
    webp \
    && rm -rf /var/lib/apt/lists/*

# Allow PDF -> PNG conversions via ImageMagick.
RUN sed -i '/domain="coder" rights="none"/d' /etc/ImageMagick-6/policy.xml

RUN curl -fsSL "https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/typst-x86_64-unknown-linux-gnu.tar.xz" \
    -o /tmp/typst.tar.xz \
    && tar -xf /tmp/typst.tar.xz -C /usr/local/bin --strip-components=1 "typst-x86_64-unknown-linux-gnu/typst" \
    && rm /tmp/typst.tar.xz

RUN npm install -g "curvenote@${CURVENOTE_VERSION}"

WORKDIR /github/workspace
