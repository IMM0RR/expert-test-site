// backend/src/routes/profileRoutes.js
import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { 
    getProfileWithStats,
    getTestDetailsForProfile 
} from '../controllers/profileController.js';

const router = express.Router();

// Все маршруты требуют авторизации
router.use(verifyToken);

// Полный профиль с статистикой
router.get('/', getProfileWithStats);

// Детали теста для профиля
router.get('/test/:id', getTestDetailsForProfile);

export default router;