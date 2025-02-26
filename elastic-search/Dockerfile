ARG NODE_VERSION=20
FROM node:${NODE_VERSION}

RUN mkdir /service
WORKDIR /service

COPY package.json .
COPY package-lock.json .
RUN npm install --save production

COPY lib lib
COPY index.js .

CMD ["node", "index.js"]