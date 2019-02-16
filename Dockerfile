FROM node:10.15-alpine

WORKDIR /usr/src/app

# ENV PATH /node_modules/.bin:$PATH
COPY package*.json ./
RUN npm install
ADD . /usr/src/app

RUN npm run build
RUN ls -d $PWD/*

# set our node environment, either development or production
# defaults to production, compose overrides this to development on build and run
ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV
ENV MONGO_CONNECTIONSTRING mongo:27017/betty

ENV PORT 8484
EXPOSE 8484

CMD [ "node", "dist/index.js" ]