import express from 'express';
import { 
  saveTestResults, 
  getUserResults,
  getTestDetails 
} from '../controllers/resultsController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Все маршруты требуют авторизации
router.use(verifyToken);

// Сохранить результаты теста
router.post('/save', saveTestResults);

// Получить все результаты пользователя
router.get('/all', getUserResults);

// Получить детали конкретного теста
router.get('/:id', getTestDetails);

export default router;