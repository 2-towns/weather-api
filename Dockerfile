FROM node:20-alpine

RUN apk --update add redis 

EXPOSE 6379

WORKDIR /app

COPY package.json /app

RUN npm install

COPY . /app

RUN npm run build

RUN npm run migration

EXPOSE 3000

EXPOSE 6379

CMD [ "sh", "start.sh" ]