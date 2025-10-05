# Etapa 1: Build
FROM node:22-alpine AS build

WORKDIR /usr/src/app

# Copiar arquivos de dependência
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.* ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Build de produção
RUN npm run build

# Etapa 2: Servir com nginx
FROM nginx:stable-alpine AS production

# Remover configurações padrão do nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiar build do Vite
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# Copiar configuração customizada do nginx (arquivo de produção)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copiar configuração principal do nginx (incluindo `user nginx;`)
COPY nginx.main.conf /etc/nginx/nginx.conf

# Copiar as chaves pública e privada para /etc/nginx/certs

# Ajustar permissões para o usuário do Nginx (se os certificados vierem por volume,
# o chown pode falhar; usamos || true para não quebrar o build). Em runtime o host
# controla as permissões dos arquivos montados.
RUN mkdir -p /etc/nginx/certs \
	&& chown -R root:root /usr/share/nginx/html /etc/nginx/certs || true \
	&& chmod -R a+rX /usr/share/nginx/html || true

# Expor HTTP e HTTPS
EXPOSE 80 443

# O entrypoint oficial do Nginx executará o processo master como root e
# os workers como 'nginx' conforme configurado em /etc/nginx/nginx.conf.
CMD ["nginx", "-g", "daemon off;"]