FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./

# Instala dependencias de forma mais limpa e deterministica (CI - Clean Install)
RUN npm ci

COPY . .

RUN npm run build

RUN mkdir -p /var/log/app && chown node:node /var/log/app

EXPOSE 3000

USER node

CMD ["node", "dist/index.js"]

