import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

// Регистрация пользователя
export const register = async (req, res) => {
  console.log('📝 Получен запрос на регистрацию:', { 
    username: req.body.username, 
    email: req.body.email,
    password: '***'
  });
  
  try {
    const { username, email, password } = req.body;

    // Валидация
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Заполните все поля: username, email, password'
      });
    }

    // Проверка существования пользователя
    const checkUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (checkUser.rows.length > 0) {
      const existing = checkUser.rows[0];
      if (existing.email === email) {
        return res.status(400).json({
          success: false,
          message: 'Пользователь с таким email уже существует'
        });
      }
      if (existing.username === username) {
        return res.status(400).json({
          success: false,
          message: 'Пользователь с таким username уже существует'
        });
      }
    }

    // Хеширование пароля
    console.log('🔐 Хешируем пароль...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Пароль захеширован');

    // Создание пользователя
    const result = await pool.query(
      `INSERT INTO users (username, email, password, role) 
       VALUES ($1, $2, $3, 'user') 
       RETURNING id, username, email, role, created_at`,
      [username, email, hashedPassword]
    );

    console.log('✅ Пользователь зарегистрирован:', result.rows[0].email);
    
    // Генерация JWT токена
    const token = jwt.sign(
      { 
        userId: result.rows[0].id,
        email: result.rows[0].email,
        role: result.rows[0].role
      },
      process.env.JWT_SECRET || 'expert-test-secret-2026',
      { expiresIn: '30d' }
    );
    
    res.status(201).json({
      success: true,
      message: 'Пользователь успешно зарегистрирован',
      token,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    
    // Ошибка уникальности (дубликат email или username)
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Пользователь с таким email или username уже существует'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Ошибка при регистрации',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Вход пользователя
export const login = async (req, res) => {
  console.log('🔐 Получен запрос на вход:', { email: req.body.email });
  
  try {
    const { email, password } = req.body;

    // Валидация
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Введите email и пароль'
      });
    }

    // Поиск пользователя
    console.log('🔍 Ищем пользователя в БД...');
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ Пользователь не найден:', email);
      return res.status(401).json({
        success: false,
        message: 'Пользователь с таким email не найден'
      });
    }

    const user = userResult.rows[0];
    console.log('✅ Пользователь найден:', user.email);
    console.log('📊 Роль пользователя:', user.role || 'user');

    // Проверка пароля с bcrypt
    console.log('🔐 Сравниваем пароли с bcrypt...');
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      console.log('❌ Неверный пароль для:', email);
      return res.status(401).json({
        success: false,
        message: 'Неверный пароль'
      });
    }

    console.log('✅ Успешный вход:', user.email);
    
    // Генерация JWT токена
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role || 'user'
      },
      process.env.JWT_SECRET || 'expert-test-secret-2026',
      { expiresIn: '30d' }
    );
    
    res.json({
      success: true,
      message: 'Вход выполнен успешно',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('❌ Ошибка входа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при входе в систему',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Получение профиля пользователя
export const getProfile = async (req, res) => {
  try {
    // userId получаем из middleware (токена)
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Требуется авторизация'
      });
    }

    const result = await pool.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Ошибка получения профиля:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении профиля'
    });
  }
};

// Проверка токена (для фронтенда)
export const verifyAuth = async (req, res) => {
  try {
    // Если middleware не вернул ошибку, значит токен валидный
    res.json({
      success: true,
      message: 'Токен действителен',
      user: {
        id: req.userId,
        email: req.userEmail,
        role: req.userRole
      }
    });
  } catch (error) {
    console.error('❌ Ошибка проверки токена:', error);
    res.status(401).json({
      success: false,
      message: 'Недействительный токен'
    });
  }
};