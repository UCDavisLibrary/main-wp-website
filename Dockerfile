FROM node:16

RUN mkdir /src
WORKDIR /src

COPY ucdlib-theme-wp/src/public/package.json package.json
COPY ucdlib-theme-wp/src/public/package-lock.json package-lock.json

RUN pwd && ls -al
RUN npm install && pwd && ls -al
RUN pwd && ls -al