// backend/src/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import testRoutes from './routes/testRoutes.js';
import resultsRoutes from './routes/resultsRoutes.js';
import profileRoutes from './routes/profileRoutes.js';

dotenv.config();

const app = express();

// CORS - разрешаем доступ с любых источников (для локальных файлов)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));



// JSON форматирование
app.set('json spaces', 2);
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use('/api/test', testRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/profile', profileRoutes);


// Логирование запросов
app.use((req, res, next) => {
  const time = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`${time} - ${req.method} ${req.url}`);
  next();
});

// Маршруты API
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);

// Корневой маршрут для проверки
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API сервер ЭКСПЕРТ-ТЕСТ работает!',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        profile: 'GET /api/auth/profile (требует токен)'
      },
      users: {
        me: 'GET /api/me (требует токен)',
        all: 'GET /api/users (только админ)',
        test: 'GET /api/test',
        dbTest: 'GET /api/db-test'
      }
    }
  });
});

// Обработка 404 для API маршрутов
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API маршрут не найден'
  });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🚀 API сервер ЭКСПЕРТ-ТЕСТ запущен на порту ${PORT}`);
  console.log(`👉 API: http://localhost:${PORT}/api/...`);
  console.log('');
  console.log('   📋 Основные endpoints:');
  console.log('');
  console.log('   🔐 Аутентификация:');
  console.log(`   POST  /api/auth/register`);
  console.log(`   POST  /api/auth/login`);
  console.log('');
  console.log('   👤 Пользователи:');
  console.log(`   GET   /api/me           (требует токен)`);
  console.log(`   GET   /api/users        (только админ)`);
  console.log(`   GET   /api/test`);
  console.log(`   GET   /api/db-test`);
  console.log('');
  console.log('   📁 Фронтенд:');
  console.log('   Открывайте HTML файлы двойным кликом');
  console.log('   Они будут обращаться к этому серверу');
  console.log('');
  console.log('='.repeat(60));
  console.log(`   🔧 Админка: /api/admin/* (только для админов)`);
  console.log(`   📊 Результаты: /api/results/*`);
});