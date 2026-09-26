FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
# `git` es necesario para resolver la dependencia git `owncoding-ui` con npm ci.
RUN apk add --no-cache libc6-compat git
COPY package*.json ./
# El `postinstall` raíz parchea el CSS de owncoding-ui; el script debe existir
# antes de `npm ci` porque esta etapa solo copia los manifiestos (Refs #75).
COPY build-tools/patch-owncoding-css.mjs build-tools/patch-owncoding-css.mjs
RUN npm ci --include=dev

FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
# `.dockerignore` excludes runtime `.env` files from this build context. Coolify
# injects runtime configuration when the container starts; never add secrets as
# Docker ARG or ENV values in this stage.
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN apk add --no-cache libc6-compat curl \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 exec node server.js"]
