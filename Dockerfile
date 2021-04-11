FROM node
WORKDIR /usr/src/app
EXPOSE 3000
COPY . .
RUN npm run build
USER node
CMD ["npm", "start"]
