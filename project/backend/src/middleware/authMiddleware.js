// backend/src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Доступ запрещен. Требуется авторизация'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'expert-test-secret-2026');
    
    // Добавляем данные пользователя в запрос
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    
    next();
  } catch (error) {
    console.error('Ошибка верификации токена:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Срок действия токена истек'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Недействительный токен'
    });
  }
};