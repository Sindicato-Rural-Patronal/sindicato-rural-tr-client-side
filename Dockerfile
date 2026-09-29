FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
# --include=dev forces devDependencies (vite, typescript) even when the build
# runs with NODE_ENV=production, which npm would otherwise use to skip them.
RUN npm ci --include=dev

# VAZIO de propósito. Sem valor, o app chama "/api" na própria origem e o
# servidor do container encaminha para o BACKEND_URL (ver server/index.mjs):
# nada de CORS e nada de endereço de backend assado no bundle. Quem quiser o
# comportamento antigo — o navegador falando direto com o backend — passa
# VITE_API_URL como BUILD ARG; aí ele volta a ser embutido.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

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
# Para onde o servidor encaminha /api/* e busca curso/notícia das meta
# OpenGraph. É variável de RUNTIME: o Coolify aplica sem precisar de build.
# CADA ambiente tem de definir a sua — este padrão existe só para o container
# subir sozinho, e aponta para staging. O servidor escreve no log, ao subir,
# para qual backend está encaminhando.
ENV BACKEND_URL=https://sindicatoruraltrbackend.nakaidev.tech
ENV PORT=80

EXPOSE 80

CMD ["node", "server/index.mjs"]
