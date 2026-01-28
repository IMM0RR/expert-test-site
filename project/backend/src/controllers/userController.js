// backend/src/controllers/userController.js
import pool from '../db.js';

export const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, role, created_at FROM users ORDER BY id DESC');
    res.json({
      success: true,
      count: result.rows.length,
      users: result.rows
    });
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка базы данных'
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    // userId получаем из middleware (токена)
    const userId = req.userId;
    
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
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка базы данных'
    });
  }
};

export const dbTest = async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as user_count FROM users');
    const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    res.json({
      success: true,
      message: 'Подключение к базе данных успешно',
      userCount: result.rows[0].user_count,
      tableStructure: tableInfo.rows,
      connectedDatabase: process.env.DB_NAME || 'expert_test'
    });
    
  } catch (error) {
    console.error('Ошибка подключения к БД:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка подключения к базе данных',
      error: error.message
    });
  }
};

export const serverTest = (req, res) => {
  res.json({
    success: true,
    message: 'Сервер работает!',
    time: new Date().toISOString(),
    project: 'ЭКСПЕРТ-ТЕСТ'
  });
};