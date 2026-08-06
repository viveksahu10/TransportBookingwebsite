FROM ghcr.io/puppeteer/puppeteer:21.5.0

WORKDIR /usr/src/app

USER root

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]