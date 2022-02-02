FROM node:17

RUN mkdir /service
WORKDIR /service

COPY package.json .
COPY package-lock.json .
RUN npm install --save production

COPY lib lib
COPY index.js .
