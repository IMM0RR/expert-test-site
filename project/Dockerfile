FROM node:18-alpine

WORKDIR /app

COPY project/backend/package*.json ./

RUN npm install --only=production

COPY project/backend/ ./

COPY project/frontend/ ./public/


EXPOSE 3000

CMD ["node", "server.js"]