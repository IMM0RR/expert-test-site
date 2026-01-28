FROM node:18-alpine

WORKDIR /app

COPY backend/src/package*.json ./

RUN npm install --only=production

COPY backend/src/ ./

EXPOSE 3000

CMD ["npm", "start"]