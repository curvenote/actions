FROM node:20-slim

LABEL org.opencontainers.image.source="https://github.com/curvenote/actions"
LABEL org.opencontainers.image.description="Pre-built environment for Curvenote GitHub Actions with image processing tools, typst, and fonts"

# Install image transformation tools, fonts, and ghostscript
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      inkscape \
      imagemagick \
      webp \
      ghostscript \
      fonts-noto \
      git \
      curl \
    && rm -rf /var/lib/apt/lists/*

# Patch ImageMagick policy to allow PDF -> PNG conversions
RUN sed -i '/domain="coder" rights="none"/d' /etc/ImageMagick-6/policy.xml

# Install curvenote CLI
RUN npm install -g curvenote

# Install typst
RUN curl -fsSL https://typst.community/typst-install/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

# Mark this as the curvenote setup container
ENV CURVENOTE_CONTAINER=true
