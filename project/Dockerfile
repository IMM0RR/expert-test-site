FROM node:18-alpine

WORKDIR /app

# Копируем и устанавливаем backend зависимости
COPY backend/src/package*.json ./
RUN npm install --only=production

# Копируем backend
COPY backend/src/ ./

# Копируем собранный фронтенд (предварительно соберите его!)
COPY frontend/build/ ./public/

# Или если фронтенд не собран, можно скопировать исходники
# COPY frontend/ ./frontend/

EXPOSE 3000
CMD ["npm", "start"]