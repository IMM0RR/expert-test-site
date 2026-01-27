import express from 'express';
import { 
  register, 
  login, 
  getProfile,
  verifyAuth 
} from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Регистрация
router.post('/register', register);

// Вход
router.post('/login', login);

// Проверка токена
router.get('/verify', verifyToken, verifyAuth);

// Профиль пользователя
router.get('/profile', verifyToken, getProfile);

export default router;