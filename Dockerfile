FROM node

ADD . /
RUN yarn

CMD ["yarn", "start"]