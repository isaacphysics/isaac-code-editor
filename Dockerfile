FROM node:17 AS build

WORKDIR /editor

COPY package.json /editor/package.json
RUN npm i

COPY public /editor/public
COPY src /editor/src

RUN npm run build

FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /editor/build /usr/share/nginx/html
