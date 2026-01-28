import pool from '../db.js';

// Получить все вопросы с ответами
export const getAllQuestions = async (req, res) => {
    try {
        // Проверяем что пользователь админ
        if (req.userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещен. Требуются права администратора'
            });
        }

        const result = await pool.query(`
            SELECT 
                q.id as question_id,
                q.question_text,
                q.competence,
                q.question_type,
                q.created_at as question_created,
                a.id as answer_id,
                a.answer_text,
                a.is_correct,
                a.created_at as answer_created
            FROM questions q
            LEFT JOIN answers a ON q.id = a.question_id
            ORDER BY q.id, a.id
        `);

        // Группируем вопросы с ответами
        const questions = {};
        result.rows.forEach(row => {
            if (!questions[row.question_id]) {
                questions[row.question_id] = {
                    id: row.question_id,
                    question_text: row.question_text,
                    competence: row.competence,
                    question_type: row.question_type,
                    created_at: row.question_created,
                    answers: []
                };
            }
            
            if (row.answer_id) {
                questions[row.question_id].answers.push({
                    id: row.answer_id,
                    answer_text: row.answer_text,
                    is_correct: row.is_correct,
                    created_at: row.answer_created
                });
            }
        });

        res.json({
            success: true,
            questions: Object.values(questions)
        });

    } catch (error) {
        console.error('❌ Ошибка получения вопросов:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении вопросов'
        });
    }
};

// Создать новый вопрос
export const createQuestion = async (req, res) => {
    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещен'
            });
        }

        const { question_text, competence, question_type } = req.body;

        if (!question_text || !competence) {
            return res.status(400).json({
                success: false,
                message: 'Заполните текст вопроса и компетенцию'
            });
        }

        const result = await pool.query(
            `INSERT INTO questions (question_text, competence, question_type) 
             VALUES ($1, $2, $3) 
             RETURNING id, question_text, competence, question_type, created_at`,
            [question_text, competence, question_type || 'single_choice']
        );

        res.status(201).json({
            success: true,
            message: 'Вопрос успешно создан',
            question: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Ошибка создания вопроса:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при создании вопроса'
        });
    }
};

// Обновить вопрос
export const updateQuestion = async (req, res) => {
    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещен'
            });
        }

        const { id } = req.params;
        const { question_text, competence, question_type } = req.body;

        const result = await pool.query(
            `UPDATE questions 
             SET question_text = $1, competence = $2, question_type = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4 
             RETURNING *`,
            [question_text, competence, question_type, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Вопрос не найден'
            });
        }

        res.json({
            success: true,
            message: 'Вопрос обновлен',
            question: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Ошибка обновления вопроса:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при обновлении вопроса'
        });
    }
};

export const checkQuestionDeletion = async (req, res) => {
    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещен'
            });
        }

        const { id } = req.params;

        // Проверяем, используется ли вопрос в каких-либо тестах
        const checkResults = await pool.query(`
            SELECT 
                COUNT(DISTINCT ua.test_result_id) as test_count,
                COUNT(DISTINCT tr.user_id) as user_count
            FROM questions q
            LEFT JOIN user_answers ua ON q.id = ua.question_id
            LEFT JOIN test_results tr ON ua.test_result_id = tr.id
            WHERE q.id = $1
            GROUP BY q.id
        `, [id]);

        const stats = checkResults.rows[0] || { test_count: 0, user_count: 0 };

        res.json({
            success: true,
            stats: {
                questionId: id,
                usedInTests: parseInt(stats.test_count) || 0,
                usedByUsers: parseInt(stats.user_count) || 0,
                canDelete: stats.test_count === 0 // Можно удалить если не используется в тестах
            }
        });

    } catch (error) {
        console.error('❌ Ошибка проверки вопроса:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при проверке вопроса'
        });
    }
};



// Удалить вопрос
export const deleteQuestion = async (req, res) => {
    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещен'
            });
        }

        const { id } = req.params;

        // Начинаем транзакцию
        await pool.query('BEGIN');

        try {
            // 1. Сначала удаляем все связанные записи в user_answers
            const userAnswersResult = await pool.query(
                `DELETE FROM user_answers 
                 WHERE question_id IN (
                    SELECT ua.question_id 
                    FROM user_answers ua
                    WHERE ua.question_id = $1
                 ) 
                 RETURNING id`,
                [id]
            );
            
            console.log(`Удалено записей из user_answers: ${userAnswersResult.rowCount}`);

            // 2. Удаляем все ответы на этот вопрос
            const answersResult = await pool.query(
                'DELETE FROM answers WHERE question_id = $1 RETURNING id',
                [id]
            );
            
            console.log(`Удалено ответов: ${answersResult.rowCount}`);

            // 3. Теперь удаляем сам вопрос
            const questionResult = await pool.query(
                'DELETE FROM questions WHERE id = $1 RETURNING id, question_text',
                [id]
            );

            if (questionResult.rows.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    message: 'Вопрос не найден'
                });
            }

            // 4. Фиксируем транзакцию
            await pool.query('COMMIT');

            console.log('✅ Вопрос успешно удален:', questionResult.rows[0].question_text);

            res.json({
                success: true,
                message: `Вопрос и все связанные данные удалены (ответов: ${answersResult.rowCount}, записей в истории: ${userAnswersResult.rowCount})`,
                stats: {
                    answersDeleted: answersResult.rowCount,
                    userAnswersDeleted: userAnswersResult.rowCount
                }
            });

        } catch (error) {
            // Откатываем транзакцию в случае ошибки
            await pool.query('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error('❌ Ошибка удаления вопроса:', error);
        console.error('Код ошибки:', error.code);
        console.error('Детали:', error.detail);
        
        // Более детальная обработка ошибок
        if (error.code === '23503') { // foreign_key_violation
            return res.status(400).json({
                success: false,
                message: `Невозможно удалить вопрос из-за связанных записей. 
                         Подробности: ${error.detail || 'Проверьте связи в БД'}`
            });
        }
        
        res.status(500).json({
            success: false,
            message: `Ошибка при удалении вопроса: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? {
                code: error.code,
                detail: error.detail,
                hint: error.hint
            } : undefined
        });
    }
};

// Добавить ответ к вопросу
export const createAnswer = async (req, res) => {
    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещен'
            });
        }

        const { question_id, answer_text, is_correct } = req.body;

        if (!question_id || !answer_text) {
            return res.status(400).json({
                success: false,
                message: 'Заполните все обязательные поля'
            });
        }

        const result = await pool.query(
            `INSERT INTO answers (question_id, answer_text, is_correct) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [question_id, answer_text, is_correct || false]
        );

        res.status(201).json({
            success: true,
            message: 'Ответ добавлен',
            answer: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Ошибка создания ответа:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при создании ответа'
        });
    }
};

// Обновить ответ
export const updateAnswer = async (req, res) => {
    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещен'
            });
        }

        const { id } = req.params;
        const { answer_text, is_correct } = req.body;

        const result = await pool.query(
            `UPDATE answers 
             SET answer_text = $1, is_correct = $2 
             WHERE id = $3 
             RETURNING *`,
            [answer_text, is_correct, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ответ не найден'
            });
        }

        res.json({
            success: true,
            message: 'Ответ обновлен',
            answer: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Ошибка обновления ответа:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при обновлении ответа'
        });
    }
};

// Удалить ответ
export const deleteAnswer = async (req, res) => {
    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещен'
            });
        }

        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM answers WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ответ не найден'
            });
        }

        res.json({
            success: true,
            message: 'Ответ удален'
        });

    } catch (error) {
        console.error('❌ Ошибка удаления ответа:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при удалении ответа'
        });
    }
};

// Получить статистику (для дашборда)
export const getAdminStats = async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }

    // УБЕРИТЕ или ЗАКОММЕНТИРУЕМ строку с test_results:
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM questions) as total_questions,
        (SELECT COUNT(*) FROM answers) as total_answers,
        (SELECT COUNT(*) FROM user_answers) as total_user_answers
    `);

    res.json({
      success: true,
      stats: stats.rows[0]
    });

  } catch (error) {
    console.error('❌ Ошибка получения статистики:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики'
    });
  }
};