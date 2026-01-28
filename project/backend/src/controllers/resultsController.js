import pool from '../db.js';

// Сохранение результатов теста
export const saveTestResults = async (req, res) => {
  try {
    const userId = req.userId;
    const { answers, questions } = req.body; // answers: [{questionId, answerIds}]

    if (!answers || !questions) {
      return res.status(400).json({
        success: false,
        message: 'Отсутствуют данные результатов'
      });
    }

    // 1. Сохраняем основной результат теста
    const testResult = await pool.query(
      `INSERT INTO test_results (user_id, total_questions, completed_at) 
       VALUES ($1, $2, CURRENT_TIMESTAMP) 
       RETURNING id`,
      [userId, questions.length]
    );

    const testResultId = testResult.rows[0].id;

    // 2. Обрабатываем ответы и вычисляем результаты
    let totalScore = 0;
    const competenceStats = {};

    for (const answer of answers) {
      const { questionId, answerIds } = answer;
      
      // Находим вопрос и правильные ответы
      const questionResult = await pool.query(
        `SELECT q.*, 
                ARRAY_AGG(a.id) FILTER (WHERE a.is_correct = true) as correct_answer_ids
         FROM questions q
         LEFT JOIN answers a ON q.id = a.question_id
         WHERE q.id = $1
         GROUP BY q.id`,
        [questionId]
      );

      if (questionResult.rows.length === 0) continue;

      const question = questionResult.rows[0];
      const correctAnswerIds = question.correct_answer_ids || [];
      
      // Проверяем правильность ответа
      let isCorrect = false;
      if (question.question_type === 'single_choice') {
        isCorrect = correctAnswerIds.length === 1 && 
                    answerIds.length === 1 && 
                    correctAnswerIds[0] === answerIds[0];
      } else {
        // Для множественного выбора
        const correctSet = new Set(correctAnswerIds);
        const answerSet = new Set(answerIds);
        isCorrect = correctAnswerIds.length === answerIds.length &&
                    correctAnswerIds.every(id => answerSet.has(id)) &&
                    answerIds.every(id => correctSet.has(id));
      }

      // Сохраняем ответ пользователя
      for (const answerId of answerIds) {
        await pool.query(
          `INSERT INTO user_answers (test_result_id, question_id, answer_id, is_correct) 
           VALUES ($1, $2, $3, $4)`,
          [testResultId, questionId, answerId, isCorrect]
        );
      }

      // Обновляем счет
      if (isCorrect) {
        totalScore++;
        
        // Обновляем статистику по компетенциям
        if (!competenceStats[question.competence]) {
          competenceStats[question.competence] = {
            score: 0,
            total: 0
          };
        }
        competenceStats[question.competence].score++;
      }

      // Обновляем общее количество вопросов по компетенциям
      if (!competenceStats[question.competence]) {
        competenceStats[question.competence] = {
          score: 0,
          total: 0
        };
      }
      competenceStats[question.competence].total++;
    }

    // 3. Обновляем общий счет
    const percentage = questions.length > 0 ? (totalScore / questions.length * 100).toFixed(2) : 0;
    
    await pool.query(
      `UPDATE test_results 
       SET total_score = $1, percentage = $2 
       WHERE id = $3`,
      [totalScore, percentage, testResultId]
    );

    // 4. Сохраняем результаты по компетенциям
    for (const [competence, stats] of Object.entries(competenceStats)) {
      const compPercentage = stats.total > 0 ? (stats.score / stats.total * 100).toFixed(2) : 0;
      
      await pool.query(
        `INSERT INTO competence_results (test_result_id, competence, score, total_questions, percentage) 
         VALUES ($1, $2, $3, $4, $5)`,
        [testResultId, competence, stats.score, stats.total, compPercentage]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Результаты теста сохранены',
      testResultId,
      totalScore,
      totalQuestions: questions.length,
      percentage
    });

  } catch (error) {
    console.error('❌ Ошибка сохранения результатов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при сохранении результатов теста'
    });
  }
};

// Получение результатов пользователя
export const getUserResults = async (req, res) => {
  try {
    const userId = req.userId;

    // Получаем все результаты тестов пользователя
    const testResults = await pool.query(
      `SELECT id, total_score, total_questions, percentage, 
              TO_CHAR(completed_at, 'DD.MM.YYYY HH24:MI') as completed_at
       FROM test_results 
       WHERE user_id = $1 
       ORDER BY completed_at DESC`,
      [userId]
    );

    // Получаем детали последнего теста
    let lastTestDetails = null;
    let competenceResults = [];
    let questionHistory = [];

    if (testResults.rows.length > 0) {
      const lastTestId = testResults.rows[0].id;

      // Результаты по компетенциям
      competenceResults = await pool.query(
        `SELECT competence, score, total_questions, percentage
         FROM competence_results 
         WHERE test_result_id = $1 
         ORDER BY competence`,
        [lastTestId]
      );

      // История ответов
      questionHistory = await pool.query(
        `SELECT 
            q.question_text,
            q.competence,
            q.question_type,
            STRING_AGG(a.answer_text, '; ') as user_answers,
            ua.is_correct,
            STRING_AGG(ca.answer_text, '; ') FILTER (WHERE ca.is_correct = true) as correct_answers
         FROM user_answers ua
         JOIN questions q ON ua.question_id = q.id
         JOIN answers a ON ua.answer_id = a.id
         LEFT JOIN answers ca ON q.id = ca.question_id AND ca.is_correct = true
         WHERE ua.test_result_id = $1
         GROUP BY q.id, q.question_text, q.competence, q.question_type, ua.is_correct
         ORDER BY q.id`,
        [lastTestId]
      );
    }

    res.json({
      success: true,
      testResults: testResults.rows,
      lastTestDetails: testResults.rows.length > 0 ? {
        ...testResults.rows[0],
        competenceResults: competenceResults.rows,
        questionHistory: questionHistory.rows
      } : null
    });

  } catch (error) {
    console.error('❌ Ошибка получения результатов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении результатов'
    });
  }
};

// Получение деталей конкретного теста
export const getTestDetails = async (req, res) => {
  try {
    const userId = req.userId;
    const testId = req.params.id;

    // Проверяем, что тест принадлежит пользователю
    const testCheck = await pool.query(
      'SELECT * FROM test_results WHERE id = $1 AND user_id = $2',
      [testId, userId]
    );

    if (testCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Результат теста не найден'
      });
    }

    // Основная информация о тесте
    const testInfo = testCheck.rows[0];

    // Результаты по компетенциям
    const competenceResults = await pool.query(
      `SELECT competence, score, total_questions, percentage
       FROM competence_results 
       WHERE test_result_id = $1 
       ORDER BY competence`,
      [testId]
    );

    // Детальная история ответов
    const questionHistory = await pool.query(
      `SELECT 
          q.id as question_id,
          q.question_text,
          q.competence,
          q.question_type,
          STRING_AGG(DISTINCT a.answer_text, '; ') as user_answers,
          BOOL_OR(ua.is_correct) as is_correct,
          STRING_AGG(DISTINCT ca.answer_text, '; ') FILTER (WHERE ca.is_correct = true) as correct_answers
       FROM user_answers ua
       JOIN questions q ON ua.question_id = q.id
       JOIN answers a ON ua.answer_id = a.id
       LEFT JOIN answers ca ON q.id = ca.question_id AND ca.is_correct = true
       WHERE ua.test_result_id = $1
       GROUP BY q.id, q.question_text, q.competence, q.question_type
       ORDER BY q.id`,
      [testId]
    );

    res.json({
      success: true,
      testInfo: {
        ...testInfo,
        completed_at: new Date(testInfo.completed_at).toLocaleString('ru-RU')
      },
      competenceResults: competenceResults.rows,
      questionHistory: questionHistory.rows,
      stats: {
        totalQuestions: testInfo.total_questions,
        correctAnswers: testInfo.total_score,
        percentage: testInfo.percentage,
        incorrectAnswers: testInfo.total_questions - testInfo.total_score
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения деталей теста:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении деталей теста'
    });
  }
};