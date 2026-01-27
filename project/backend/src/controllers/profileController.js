// backend/src/controllers/profileController.js
import pool from '../db.js';

// Получение данных профиля с статистикой
export const getProfileWithStats = async (req, res) => {
    try {
        const userId = req.userId;

        // Получаем основную информацию о пользователе
        const userResult = await pool.query(
            `SELECT id, username, email, role, created_at 
             FROM users 
             WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        const user = userResult.rows[0];

        // Получаем статистику по тестам
        const testStats = await pool.query(
            `SELECT 
                COUNT(*) as total_tests,
                COALESCE(AVG(percentage), 0) as average_percentage,
                COALESCE(SUM(total_score), 0) as total_correct,
                COALESCE(SUM(total_questions), 0) as total_questions
             FROM test_results 
             WHERE user_id = $1`,
            [userId]
        );

        // Получаем историю тестов
        const testHistory = await pool.query(
            `SELECT 
                id,
                total_score,
                total_questions,
                percentage,
                completed_at,
                TO_CHAR(completed_at, 'DD.MM.YYYY HH24:MI') as formatted_date,
                EXTRACT(DAY FROM completed_at) as day,
                TO_CHAR(completed_at, 'Month') as month,
                EXTRACT(YEAR FROM completed_at) as year
             FROM test_results 
             WHERE user_id = $1 
             ORDER BY completed_at DESC 
             LIMIT 10`,
            [userId]
        );

        // Получаем лучшие результаты по компетенциям
        const bestCompetences = await pool.query(
            `SELECT 
                cr.competence,
                ROUND(AVG(cr.percentage), 1) as avg_percentage,
                COUNT(*) as times_tested
             FROM competence_results cr
             JOIN test_results tr ON cr.test_result_id = tr.id
             WHERE tr.user_id = $1
             GROUP BY cr.competence
             ORDER BY avg_percentage DESC
             LIMIT 3`,
            [userId]
        );

        // Форматируем историю тестов для фронтенда
        const formattedHistory = testHistory.rows.map(test => ({
            id: test.id,
            score: test.total_score,
            total: test.total_questions,
            percentage: test.percentage,
            date: test.formatted_date,
            dateParts: {
                day: test.day,
                month: test.month,
                year: test.year
            }
        }));

        const stats = testStats.rows[0];

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                createdAt: user.created_at
            },
            stats: {
                testsCompleted: parseInt(stats.total_tests) || 0,
                avgResult: parseFloat(stats.average_percentage || 0).toFixed(1),
                totalCorrect: parseInt(stats.total_correct) || 0,
                totalQuestions: parseInt(stats.total_questions) || 0
            },
            testHistory: formattedHistory,
            bestCompetences: bestCompetences.rows,
            summary: {
                totalTests: parseInt(stats.total_tests) || 0,
                avgPercentage: parseFloat(stats.average_percentage || 0).toFixed(1),
                successRate: stats.total_questions > 0 
                    ? ((stats.total_correct / stats.total_questions) * 100).toFixed(1)
                    : 0
            }
        });

    } catch (error) {
        console.error('❌ Ошибка получения профиля:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении данных профиля'
        });
    }
};

// Получение деталей конкретного теста для профиля
export const getTestDetailsForProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const testId = req.params.id;

        // Проверяем, что тест принадлежит пользователю
        const testCheck = await pool.query(
            `SELECT tr.*, 
                    TO_CHAR(tr.completed_at, 'DD.MM.YYYY HH24:MI') as formatted_date
             FROM test_results tr
             WHERE tr.id = $1 AND tr.user_id = $2`,
            [testId, userId]
        );

        if (testCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Результат теста не найден или доступ запрещен'
            });
        }

        const testInfo = testCheck.rows[0];

        // Результаты по компетенциям
        const competenceResults = await pool.query(
            `SELECT competence, score, total_questions, percentage
             FROM competence_results 
             WHERE test_result_id = $1 
             ORDER BY competence`,
            [testId]
        );

        // Основные метрики теста
        const metrics = {
            testId: testInfo.id,
            date: testInfo.formatted_date,
            score: testInfo.total_score,
            total: testInfo.total_questions,
            percentage: testInfo.percentage,
            completedAt: testInfo.completed_at
        };

        res.json({
            success: true,
            testInfo: metrics,
            competenceResults: competenceResults.rows,
            summary: {
                correctAnswers: testInfo.total_score,
                totalQuestions: testInfo.total_questions,
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