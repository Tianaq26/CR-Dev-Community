# Build context: this folder (frontend/). Builds the static site and serves it with nginx.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Same-origin API (nginx proxies /api), so VITE_API_URL stays empty. The demo button is on for local use.
ARG VITE_DEMO_LOGIN=true
ENV VITE_DEMO_LOGIN=$VITE_DEMO_LOGIN
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
