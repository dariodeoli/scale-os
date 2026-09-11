FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS backend-dependencies
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont postgresql18-client tini \
    && addgroup --system --gid 1001 scale \
    && adduser --system --uid 1001 --ingroup scale scale
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY --from=build --chown=scale:scale /app/.next/standalone ./.next/standalone
COPY --from=build --chown=scale:scale /app/.next/static ./.next/standalone/.next/static
COPY --from=build --chown=scale:scale /app/public ./.next/standalone/public
COPY --chown=scale:scale backend ./backend
COPY --from=backend-dependencies --chown=scale:scale /app/backend/node_modules ./backend/node_modules
COPY --chown=scale:scale deployment ./deployment
USER scale
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/sbin/tini","--"]
CMD ["node","deployment/start.mjs"]
