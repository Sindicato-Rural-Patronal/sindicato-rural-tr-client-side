FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
# --include=dev forces devDependencies (vite, typescript) even when the build
# runs with NODE_ENV=production, which npm would otherwise use to skip them.
RUN npm ci --include=dev

# Backend URL baked into the bundle at build time. Defaults to the production
# backend; override with a build-time env var in Coolify if it ever changes.
ARG VITE_API_URL=https://sindicatoruraltrbackend.nakaidev.tech
ENV VITE_API_URL=$VITE_API_URL

# Sentry (opcional): defina como build-arg no Coolify pra ligar o monitoramento
# de erros do frontend. Vazio = inerte.
ARG VITE_SENTRY_DSN=
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

COPY . .
RUN npm run build


FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Só deps de produção (inclui fastify + @fastify/static usados pelo servidor).
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY server ./server

# BACKEND_URL é usado em RUNTIME pelo servidor pra buscar curso/notícia e
# injetar as meta OpenGraph. Pode ser sobrescrito no Coolify.
ENV BACKEND_URL=https://sindicatoruraltrbackend.nakaidev.tech
ENV PORT=80

EXPOSE 80

CMD ["node", "server/index.mjs"]
