FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
# --include=dev forces devDependencies (vite, typescript) even when the build
# runs with NODE_ENV=production, which npm would otherwise use to skip them.
RUN npm ci --include=dev

COPY . .
RUN npm run build


FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

# Template is processed by envsubst at container start (nginx official image feature)
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
