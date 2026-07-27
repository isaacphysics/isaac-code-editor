FROM node:22 AS build

WORKDIR /editor

COPY package.json /editor/package.json
COPY tsconfig.json /editor/tsconfig.json
COPY vite.config.ts /editor/vite.config.ts
RUN yarn

COPY public /editor/public
COPY src /editor/src
COPY index.html /editor/index.html

RUN yarn run build

FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /editor/build /usr/share/nginx/html
