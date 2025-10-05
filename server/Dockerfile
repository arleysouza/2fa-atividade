FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./

# Instala dependências de forma mais limpa e determinístic (CI - Clean Install)
RUN npm ci

COPY . .

RUN npm run build 

EXPOSE 3000

USER node

CMD ["node", "dist/index.js"]