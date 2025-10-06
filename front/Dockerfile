# Etapa 1: Build
FROM node:22-alpine AS build
ARG VITE_TRANSPORT_ENCRYPTION_KEY
ENV VITE_TRANSPORT_ENCRYPTION_KEY=${VITE_TRANSPORT_ENCRYPTION_KEY}
RUN test -n "${VITE_TRANSPORT_ENCRYPTION_KEY}" || (echo "VITE_TRANSPORT_ENCRYPTION_KEY is required" && exit 1)

WORKDIR /usr/src/app

# Copiar arquivos de dependÃªncia
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.* ./

# Instalar dependÃªncias
RUN npm ci

# Copiar cÃ³digo fonte
COPY . .

# Build de produÃ§Ã£o
RUN npm run build

# Etapa 2: Servir com nginx
FROM nginx:stable-alpine AS production

# Remover configuraÃ§Ãµes padrÃ£o do nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiar build do Vite
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# Copiar configuraÃ§Ã£o customizada do nginx (arquivo de produÃ§Ã£o)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copiar configuraÃ§Ã£o principal do nginx (incluindo `user nginx;`)
COPY nginx.main.conf /etc/nginx/nginx.conf

# Copiar as chaves pÃºblica e privada para /etc/nginx/certs

# Ajustar permissÃµes para o usuÃ¡rio do Nginx (se os certificados vierem por volume,
# o chown pode falhar; usamos || true para nÃ£o quebrar o build). Em runtime o host
# controla as permissÃµes dos arquivos montados.
RUN mkdir -p /etc/nginx/certs \
	&& chown -R root:root /usr/share/nginx/html /etc/nginx/certs || true \
	&& chmod -R a+rX /usr/share/nginx/html || true

# Expor HTTP e HTTPS
EXPOSE 80 443

# O entrypoint oficial do Nginx executarÃ¡ o processo master como root e
# os workers como 'nginx' conforme configurado em /etc/nginx/nginx.conf.
CMD ["nginx", "-g", "daemon off;"]
