# Production image (WL-6). One image per client copy. See docs/deploy.md.
#
#   docker build -t store \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://www.example-store.com \
#     --build-arg NEXT_PUBLIC_INDEXABLE=true .
#
# NEXT_PUBLIC_* values are baked into the browser code at build time, so they are build args.
# Every other setting (DATABASE_URL, secrets, SMTP) is passed at run time. .env files, local
# databases and unlicensed media are excluded by .dockerignore and never enter the image.

FROM node:24-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_INDEXABLE=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_INDEXABLE=$NEXT_PUBLIC_INDEXABLE \
    NEXT_PUBLIC_MEDIA_PREVIEW= \
    NEXT_PUBLIC_CONTENT_PREVIEW=
RUN test -n "$NEXT_PUBLIC_SITE_URL" || (echo "Set --build-arg NEXT_PUBLIC_SITE_URL=https://your-domain" && exit 1)
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
COPY --from=build --chown=node:node /app/package.json /app/next.config.ts /app/tsconfig.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --from=build --chown=node:node /app/scripts ./scripts
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Apply database migrations, then serve. The seed runs on first use and never overwrites data.
CMD ["sh", "-c", "node scripts/db-migrate.mjs && exec npx next start -p ${PORT}"]
