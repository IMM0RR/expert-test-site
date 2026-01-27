import pool from '../db.js';

// Получить вопросы для теста (публичный, но требует авторизации)
export const getTestQuestions = async (req, res) => {
  try {
    // Просто проверяем что пользователь авторизован (не проверяем роль)
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'Требуется авторизация'
      });
    }

    // Получаем вопросы с ответами
    const result = await pool.query(`
      SELECT 
        q.id,
        q.question_text,
        q.competence,
        q.question_type,
        a.id as answer_id,
        a.answer_text,
        a.is_correct
      FROM questions q
      LEFT JOIN answers a ON q.id = a.question_id
      ORDER BY q.id, a.id
    `);

    // Группируем вопросы с ответами
    const questions = {};
    result.rows.forEach(row => {
      if (!questions[row.id]) {
        questions[row.id] = {
          id: row.id,
          question_text: row.question_text,
          competence: row.competence,
          question_type: row.question_type,
          answers: []
        };
      }
      
      if (row.answer_id) {
        questions[row.id].answers.push({
          id: row.answer_id,
          answer_text: row.answer_text,
          is_correct: row.is_correct
        });
      }
    });

    res.json({
      success: true,
      questions: Object.values(questions)
    });

  } catch (error) {
    console.error('❌ Ошибка получения вопросов для теста:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении вопросов для теста'
    });
  }
};