import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
    getAllQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    createAnswer,
    updateAnswer,
    deleteAnswer,
    getAdminStats,
    checkQuestionDeletion // Добавьте эту импорт
} from '../controllers/adminController.js';

const router = express.Router();

// Все маршруты требуют админских прав
router.use(verifyToken);

// Статистика
router.get('/stats', getAdminStats);

// Вопросы
router.get('/questions', getAllQuestions);
router.post('/questions', createQuestion);
router.put('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);
router.get('/questions/:id/check', checkQuestionDeletion); // Новый маршрут

// Ответы
router.post('/answers', createAnswer);
router.put('/answers/:id', updateAnswer);
router.delete('/answers/:id', deleteAnswer);

export default router;