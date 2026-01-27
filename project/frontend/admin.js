// URL API
const API_URL = 'http://localhost:3000/api';
let currentQuestionId = null;
let currentQuestionAnswers = [];

// Показать сообщение
function showMessage(text, type = 'info') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

// Проверка авторизации и прав админа
async function checkAdminAccess() {
    const token = localStorage.getItem('expert_test_token');
    const userData = localStorage.getItem('expert_test_user');
    
    if (!token || !userData) {
        window.location.href = 'login.html';
        return false;
    }
    
    try {
        const user = JSON.parse(userData);
        if (user.role !== 'admin') {
            showMessage('У вас нет прав доступа к админ-панели', 'error');
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 2000);
            return false;
        }
        return true;
    } catch (error) {
        window.location.href = 'login.html';
        return false;
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', async function() {
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) return;
    
    // Настройка кнопок
    document.getElementById('addQuestionBtn').addEventListener('click', showQuestionForm);
    document.getElementById('addAnswerBtn').addEventListener('click', showAnswerForm);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Настройка форм
    document.getElementById('newQuestionForm').addEventListener('submit', handleQuestionSubmit);
    document.getElementById('newAnswerForm').addEventListener('submit', handleAnswerSubmit);
    
    // Загрузка данных
    await loadStats();
    await loadQuestions();
});

// Загрузка статистики
async function loadStats() {
    try {
        const token = localStorage.getItem('expert_test_token');
        const response = await fetch(`${API_URL}/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const stats = data.stats;
            document.getElementById('statsContainer').innerHTML = `
                <div class="stat-card">
                    <div class="stat-value">${stats.total_users || 0}</div>
                    <div class="stat-label">Пользователей</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.total_questions || 0}</div>
                    <div class="stat-label">Вопросов</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.total_answers || 0}</div>
                    <div class="stat-label">Ответов</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.total_tests || 0}</div>
                    <div class="stat-label">Пройдено тестов</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        document.getElementById('statsContainer').innerHTML = '<div class="loading">Ошибка загрузки статистики</div>';
    }
}

// Загрузка вопросов
async function loadQuestions() {
    try {
        const token = localStorage.getItem('expert_test_token');
        const response = await fetch(`${API_URL}/admin/questions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayQuestions(data.questions);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка загрузки вопросов:', error);
        showMessage('Ошибка загрузки вопросов', 'error');
    }
}

// Отображение вопросов
function displayQuestions(questions) {
    const container = document.getElementById('questionsList');
    
    if (!questions || questions.length === 0) {
        container.innerHTML = '<div class="loading">Нет вопросов. Добавьте первый вопрос!</div>';
        return;
    }
    
    container.innerHTML = questions.map((question, index) => `
        <div class="question-item" id="question-${question.id}">
            <div class="question-header">
                <div class="question-text">${index + 1}. ${question.question_text}</div>
                <div class="question-actions">
                    <button class="action-btn answers-btn" onclick="showAnswers(${question.id})">
                        Ответы (${question.answers ? question.answers.length : 0})
                    </button>
                    <button class="action-btn edit-btn" onclick="editQuestion(${question.id})">Редактировать</button>
                    <button class="action-btn delete-btn" onclick="confirmDeleteQuestion(${question.id})">Удалить</button>
                </div>
            </div>
            <div class="question-meta">
                <span class="badge badge-competence">${question.competence}</span>
                <span class="badge badge-type">
                    ${question.question_type === 'single_choice' ? 'Один ответ' : 'Несколько ответов'}
                </span>
                <span class="badge">ID: ${question.id}</span>
            </div>
        </div>
    `).join('');
}

// Показать форму добавления вопроса
function showQuestionForm() {
    document.getElementById('questionForm').style.display = 'block';
    document.getElementById('newQuestionForm').reset();
}

// Скрыть форму добавления вопроса
function hideQuestionForm() {
    document.getElementById('questionForm').style.display = 'none';
}

// Обработка добавления вопроса
async function handleQuestionSubmit(e) {
    e.preventDefault();
    
    const questionText = document.getElementById('questionText').value;
    const competence = document.getElementById('competence').value;
    const questionType = document.getElementById('questionType').value;
    
    if (!questionText || !competence) {
        showMessage('Заполните все обязательные поля', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('expert_test_token');
        const response = await fetch(`${API_URL}/admin/questions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question_text: questionText,
                competence: competence,
                question_type: questionType
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Вопрос успешно добавлен!', 'success');
            hideQuestionForm();
            await loadQuestions();
            await loadStats();
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка добавления вопроса:', error);
        showMessage('Ошибка добавления вопроса', 'error');
    }
}

// Редактирование вопроса (базовая версия)
async function editQuestion(questionId) {
    try {
        const token = localStorage.getItem('expert_test_token');
        const response = await fetch(`${API_URL}/admin/questions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const question = data.questions.find(q => q.id === questionId);
            if (question) {
                // Заполняем форму редактирования
                document.getElementById('questionText').value = question.question_text;
                document.getElementById('competence').value = question.competence;
                document.getElementById('questionType').value = question.question_type;
                
                showQuestionForm();
                
                // Меняем форму на редактирование
                const form = document.getElementById('newQuestionForm');
                form.onsubmit = async function(e) {
                    e.preventDefault();
                    
                    const updatedQuestion = {
                        question_text: document.getElementById('questionText').value,
                        competence: document.getElementById('competence').value,
                        question_type: document.getElementById('questionType').value
                    };
                    
                    const updateResponse = await fetch(`${API_URL}/admin/questions/${questionId}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(updatedQuestion)
                    });
                    
                    const updateData = await updateResponse.json();
                    
                    if (updateData.success) {
                        showMessage('Вопрос успешно обновлен!', 'success');
                        hideQuestionForm();
                        await loadQuestions();
                        
                        // Восстанавливаем оригинальный обработчик
                        form.onsubmit = handleQuestionSubmit;
                    } else {
                        showMessage(updateData.message, 'error');
                    }
                };
            }
        }
    } catch (error) {
        console.error('Ошибка редактирования вопроса:', error);
        showMessage('Ошибка редактирования вопроса', 'error');
    }
}


// Подтверждение удаления вопроса
async function confirmDeleteQuestion(questionId) {
    try {
        // Сначала проверяем, можно ли удалить вопрос
        const token = localStorage.getItem('expert_test_token');
        const checkResponse = await fetch(`${API_URL}/admin/questions/${questionId}/check`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const checkData = await checkResponse.json();
        
        if (checkData.success) {
            const stats = checkData.stats;
            
            let message = 'Вы уверены, что хотите удалить этот вопрос?';
            
            if (stats.usedInTests > 0) {
                message = `Этот вопрос используется в ${stats.usedInTests} тестах у ${stats.usedByUsers} пользователей.\n\n`;
                message += 'Удаление вопроса может нарушить историю тестирования.\n\n';
                message += 'Всё равно удалить?';
                
                document.getElementById('modalTitle').textContent = '⚠️ Предупреждение';
            } else {
                document.getElementById('modalTitle').textContent = 'Удаление вопроса';
            }
            
            document.getElementById('modalMessage').textContent = message;
            document.getElementById('confirmModal').style.display = 'flex';
            
            document.getElementById('confirmBtn').onclick = function() {
                deleteQuestion(questionId);
                document.getElementById('confirmModal').style.display = 'none';
            };
            
            document.getElementById('cancelBtn').onclick = function() {
                document.getElementById('confirmModal').style.display = 'none';
            };
        } else {
            showMessage('Не удалось проверить вопрос', 'error');
        }
    } catch (error) {
        console.error('Ошибка проверки вопроса:', error);
        // Показываем стандартное подтверждение
        document.getElementById('modalTitle').textContent = 'Удаление вопроса';
        document.getElementById('modalMessage').textContent = 'Вы уверены, что хотите удалить этот вопрос? Все связанные ответы также будут удалены.';
        document.getElementById('confirmModal').style.display = 'flex';
        
        document.getElementById('confirmBtn').onclick = function() {
            deleteQuestion(questionId);
            document.getElementById('confirmModal').style.display = 'none';
        };
        
        document.getElementById('cancelBtn').onclick = function() {
            document.getElementById('confirmModal').style.display = 'none';
        };
    }
}

// Удаление вопроса
async function deleteQuestion(questionId) {
    try {
        const token = localStorage.getItem('expert_test_token');
        const response = await fetch(`${API_URL}/admin/questions/${questionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Вопрос успешно удален', 'success');
            await loadQuestions();
            await loadStats();
            hideAnswersSection();
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка удаления вопроса:', error);
        showMessage('Ошибка удаления вопроса', 'error');
    }
}

// Показать ответы для вопроса
async function showAnswers(questionId) {
    currentQuestionId = questionId;
    document.getElementById('answersSection').style.display = 'block';
    document.getElementById('answersTitle').textContent = `Ответы для вопроса #${questionId}`;
    
    // Прокручиваем к секции ответов
    document.getElementById('answersSection').scrollIntoView({ behavior: 'smooth' });
    
    await loadAnswers(questionId);
}

// Загрузка ответов
async function loadAnswers(questionId) {
    try {
        const token = localStorage.getItem('expert_test_token');
        const response = await fetch(`${API_URL}/admin/questions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const question = data.questions.find(q => q.id === questionId);
            if (question && question.answers) {
                currentQuestionAnswers = question.answers;
                displayAnswers(question.answers);
            } else {
                currentQuestionAnswers = [];
                displayAnswers([]);
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки ответов:', error);
        showMessage('Ошибка загрузки ответов', 'error');
    }
}

// Отображение ответов
function displayAnswers(answers) {
    const container = document.getElementById('answersList');
    
    if (!answers || answers.length === 0) {
        container.innerHTML = '<div class="loading">Нет ответов. Добавьте первый ответ!</div>';
        return;
    }
    
    container.innerHTML = answers.map((answer, index) => `
        <div class="answer-item">
            <div class="answer-header">
                <div class="answer-text">${index + 1}. ${answer.answer_text}</div>
                <div class="answer-actions">
                    <button class="action-btn edit-btn" onclick="editAnswer(${answer.id})"></button>
                    <button class="action-btn delete-btn" onclick="confirmDeleteAnswer(${answer.id})"></button>
                </div>
            </div>
            <div>
                <span class="answer-correct ${answer.is_correct ? 'correct-true' : 'correct-false'}">
                    ${answer.is_correct ? '✓ Правильный' : '✗ Неправильный'}
                </span>
                <span class="badge" style="margin-left: 10px;">ID: ${answer.id}</span>
            </div>
        </div>
    `).join('');
}

// Скрыть секцию ответов
function hideAnswersSection() {
    document.getElementById('answersSection').style.display = 'none';
    currentQuestionId = null;
    currentQuestionAnswers = [];
}

// Показать форму добавления ответа
function showAnswerForm() {
    if (!currentQuestionId) {
        showMessage('Сначала выберите вопрос', 'error');
        return;
    }
    
    document.getElementById('currentQuestionId').value = currentQuestionId;
    document.getElementById('answerForm').style.display = 'block';
    document.getElementById('newAnswerForm').reset();
}

// Скрыть форму добавления ответа
function hideAnswerForm() {
    document.getElementById('answerForm').style.display = 'none';
}

// Обработка добавления ответа
async function handleAnswerSubmit(e) {
    e.preventDefault();
    
    const questionId = document.getElementById('currentQuestionId').value;
    const answerText = document.getElementById('answerText').value;
    const isCorrect = document.getElementById('isCorrect').checked;
    
    if (!answerText) {
        showMessage('Введите текст ответа', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('expert_test_token');
        const response = await fetch(`${API_URL}/admin/answers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question_id: questionId,
                answer_text: answerText,
                is_correct: isCorrect
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Ответ успешно добавлен!', 'success');
            hideAnswerForm();
            await loadAnswers(questionId);
            await loadStats();
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка добавления ответа:', error);
        showMessage('Ошибка добавления ответа', 'error');
    }
}

// Редактирование ответа
async function editAnswer(answerId) {
    const answer = currentQuestionAnswers.find(a => a.id === answerId);
    if (!answer) return;
    
    document.getElementById('currentQuestionId').value = currentQuestionId;
    document.getElementById('answerText').value = answer.answer_text;
    document.getElementById('isCorrect').checked = answer.is_correct;
    
    showAnswerForm();
    
    const form = document.getElementById('newAnswerForm');
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        const updatedAnswer = {
            answer_text: document.getElementById('answerText').value,
            is_correct: document.getElementById('isCorrect').checked
        };
        
        try {
            const token = localStorage.getItem('expert_test_token');
            const response = await fetch(`${API_URL}/admin/answers/${answerId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedAnswer)
            });
            
            const data = await response.json();
            
            if (data.success) {
                showMessage('Ответ успешно обновлен!', 'success');
                hideAnswerForm();
                await loadAnswers(currentQuestionId);
                
                // Восстанавливаем оригинальный обработчик
                form.onsubmit = handleAnswerSubmit;
            } else {
                showMessage(data.message, 'error');
            }
        } catch (error) {
            console.error('Ошибка редактирования ответа:', error);
            showMessage('Ошибка редактирования ответа', 'error');
        }
    };
}

// Подтверждение удаления ответа
function confirmDeleteAnswer(answerId) {
    document.getElementById('modalTitle').textContent = 'Удаление ответа';
    document.getElementById('modalMessage').textContent = 'Вы уверены, что хотите удалить этот ответ?';
    document.getElementById('confirmModal').style.display = 'flex';
    
    document.getElementById('confirmBtn').onclick = function() {
        deleteAnswer(answerId);
        document.getElementById('confirmModal').style.display = 'none';
    };
    
    document.getElementById('cancelBtn').onclick = function() {
        document.getElementById('confirmModal').style.display = 'none';
    };
}

// Удаление ответа
async function deleteAnswer(answerId) {
    try {
        const token = localStorage.getItem('expert_test_token');
        const response = await fetch(`${API_URL}/admin/answers/${answerId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Ответ успешно удален', 'success');
            await loadAnswers(currentQuestionId);
            await loadStats();
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка удаления ответа:', error);
        showMessage('Ошибка удаления ответа', 'error');
    }
}

// Выход из системы
function logout() {
    localStorage.removeItem('expert_test_user');
    localStorage.removeItem('expert_test_token');
    window.location.href = 'login.html';
}