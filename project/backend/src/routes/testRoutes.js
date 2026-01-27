import express from 'express';
import { getTestQuestions } from '../controllers/testController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Получить вопросы для теста (требует авторизации, но не админа)
router.get('/questions', verifyToken, getTestQuestions);

export default router;