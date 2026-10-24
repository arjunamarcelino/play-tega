# syntax=docker/dockerfile:1
# Production image for the TEGA Next.js app (Next 14 standalone output).
#
# BUILD CONTEXT = REPOSITORY ROOT (the app lives in web/). Most PaaS build with the
# repo root as context, so all COPY paths are prefixed with web/. Build locally with:
#
#   docker build -f web/Dockerfile \
#     --build-arg NEXT_PUBLIC_CONTRACT_ADDRESS=0xB45A79238aD1E9A2eb85E9E2e3dd57E10FeA2aeC \
#     --build-arg NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxxx \
#     --build-arg NEXT_PUBLIC_USDC_ADDRESS=0x56bf9CDc3C1876F3F22655a0016C2743E9e39a73 \
#     --build-arg NEXT_PUBLIC_FAUCET_URL=https://devnads.com/tokens \
#     --build-arg NEXT_PUBLIC_EXPLORER_URL=https://testnet.monadvision.com \
#     .                                    # <-- context is the repo root, not web/
#   docker run --rm -p 3000:3000 <image>
#
# NEXT_PUBLIC_* are inlined at BUILD time → pass via --build-arg, not `docker run`.
# Production (mainnet): set USDC to the mainnet token + explorer to the mainnet
# explorer, and OMIT NEXT_PUBLIC_FAUCET_URL so no faucet UI renders (fail-closed).

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ---- deps: install node_modules (with the toolchain for any native module) ----
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY web/package.json web/package-lock.json ./
# --legacy-peer-deps: vitest 5 declares a peer on @types/node >=22 while the repo
# pins ^20; the mismatch is dev-only and does not affect the production bundle.
RUN npm ci --legacy-peer-deps

# ---- builder: compile the standalone server ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY web/ .

ARG NEXT_PUBLIC_CONTRACT_ADDRESS
ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ARG NEXT_PUBLIC_USDC_ADDRESS
ARG NEXT_PUBLIC_USDC_DECIMALS
ARG NEXT_PUBLIC_FAUCET_URL
ARG NEXT_PUBLIC_EXPLORER_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_CONTRACT_ADDRESS=$NEXT_PUBLIC_CONTRACT_ADDRESS \
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID \
    NEXT_PUBLIC_USDC_ADDRESS=$NEXT_PUBLIC_USDC_ADDRESS \
    NEXT_PUBLIC_USDC_DECIMALS=$NEXT_PUBLIC_USDC_DECIMALS \
    NEXT_PUBLIC_FAUCET_URL=$NEXT_PUBLIC_FAUCET_URL \
    NEXT_PUBLIC_EXPLORER_URL=$NEXT_PUBLIC_EXPLORER_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: minimal runtime ----
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# public assets + the traced standalone server + static chunks
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
