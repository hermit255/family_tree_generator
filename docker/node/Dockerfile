FROM node:24.22.2-bookworm-slim

# workerd (wrangler) の外部通信に CA 証明書が必要
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ARG UID=1000
ARG GID=1000
RUN groupmod -g ${GID} node && usermod -u ${UID} -g ${GID} node

# pnpm は package.json の packageManager に合わせて corepack で固定し、イメージに焼き込む
ENV COREPACK_HOME=/opt/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p ${COREPACK_HOME} && chown node:node ${COREPACK_HOME} \
    && corepack enable

USER node
RUN corepack prepare pnpm@12.16.1 --activate && pnpm -v

WORKDIR /workspace
