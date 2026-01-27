// backend/src/routes/userRoutes.js
import express from 'express';
import { 
  getAllUsers, 
  getCurrentUser, 
  dbTest, 
  serverTest 
} from '../controllers/userController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Тест сервера (публичный)
router.get('/test', serverTest);

// Тест базы данных (публичный)
router.get('/db-test', dbTest);

// Получить текущего пользователя (требует токен)
router.get('/me', verifyToken, getCurrentUser);

// Получить всех пользователей (требует токен, только админ)
router.get('/users', verifyToken, getAllUsers);

export default router;