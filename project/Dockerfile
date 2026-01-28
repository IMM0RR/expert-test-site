FROM node:18-alpine

WORKDIR /app

# 1. Копируем и устанавливаем backend зависимости
COPY backend/src/package*.json ./
RUN npm install --only=production

# 2. Копируем backend исходный код
COPY backend/src/ ./

# 3. Копируем фронтенд (в папку frontend внутри контейнера)
COPY frontend/ ./frontend/

EXPOSE 3000
CMD ["npm", "start"]