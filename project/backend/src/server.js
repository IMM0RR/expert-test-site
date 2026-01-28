// backend/src/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import testRoutes from './routes/testRoutes.js';
import resultsRoutes from './routes/resultsRoutes.js';
import profileRoutes from './routes/profileRoutes.js';

dotenv.config();

// Получаем __dirname в ES модулях
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS - разрешаем доступ с любых источников
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSON форматирование
app.set('json spaces', 2);
app.use(express.json());

// ========== СТАТИЧЕСКИЕ ФАЙЛЫ ФРОНТЕНДА ==========
// Раздаем статические файлы из папки frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ========== МАРШРУТЫ ФРОНТЕНДА (HTML СТРАНИЦЫ) ==========
// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Страница логина
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'login.html'));
});

// Страница регистрации
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'register.html'));
});

// Страница профиля
app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'profile.html'));
});

// Админка
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'admin.html'));
});

// Активный тест
app.get('/test-active', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'test-active.html'));
});

// Результаты
app.get('/results', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'results.html'));
});

// Детали теста
app.get('/test-details', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'test-details.html'));
});

// ========== ЛОГИРОВАНИЕ ЗАПРОСОВ ==========
app.use((req, res, next) => {
  const time = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(${time} - ${req.method} ${req.url});
  next();
});

// ========== API МАРШРУТЫ ==========
app.use('/api/admin', adminRoutes);
app.use('/api/test', testRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);

// ========== КОРНЕВОЙ МАРШРУТ API (резервный) ==========
app.get('/api', (req, res) => {
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
      },
      frontend: {
        home: 'GET /',
        login: 'GET /login',
        register: 'GET /register',
        profile: 'GET /profile',
        admin: 'GET /admin',
        testActive: 'GET /test-active',
        results: 'GET /results',
        testDetails: 'GET /test-details'
      }
    }
  });
});

// ========== ОБРАБОТКА 404 ДЛЯ API ==========
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API маршрут не найден'
  });
});