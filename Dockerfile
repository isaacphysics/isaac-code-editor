FROM node:22 AS build

WORKDIR /editor

COPY package.json /editor/package.json
COPY tsconfig.json /editor/tsconfig.json
COPY webpack.config.js /editor/webpack.config.js
RUN yarn

COPY public /editor/public
COPY src /editor/src

RUN yarn run build

FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /editor/build /usr/share/nginx/html
