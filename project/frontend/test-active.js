// URL API
const API_URL = window.location.origin + "/api";

// Переменные для хранения данных теста
let questions = [];
let userAnswers = {};
let currentQuestionIndex = 0;

// Элементы DOM
const questionSection = document.getElementById('questionSection');
const navigationSidebar = document.getElementById('navigationSidebar');
const noQuestionsMessage = document.getElementById('noQuestionsMessage');
const questionText = document.getElementById('questionText');
const questionCounter = document.getElementById('questionCounter');
const competenceBadge = document.getElementById('competenceBadge');
const optionsList = document.getElementById('optionsList');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitTestBtn = document.getElementById('submitTestBtn');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const totalQuestions = document.getElementById('totalQuestions');
const answeredCount = document.getElementById('answeredCount');
const questionsGrid = document.getElementById('questionsGrid');
const confirmModal = document.getElementById('confirmModal');
const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');
const cancelSubmitBtn = document.getElementById('cancelSubmitBtn');
const modalMessage = document.getElementById('modalMessage');
const messageEl = document.getElementById('message');

// Показать сообщение
function showMessage(text, type = 'info') {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    if (type !== 'info') {
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }
}

// Проверка авторизации
async function checkAuth() {
    const token = localStorage.getItem('expert_test_token');
    const userData = localStorage.getItem('expert_test_user');
    
    if (!token || !userData) {
        window.location.href = 'login.html';
        return false;
    }
    
    return true;
}

// Загрузка вопросов с сервера
async function loadQuestions() {
    try {
        const token = localStorage.getItem('expert_test_token');
        
        console.log('Загружаем вопросы с сервера...');
        showMessage('Загрузка вопросов...', 'info');
        
        const response = await fetch(`${API_URL}/test/questions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Ответ от сервера:', response.status);
        
        if (response.status === 401) {
            showMessage('Сессия истекла. Пожалуйста, войдите снова.', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return false;
        }
        
        const data = await response.json();
        console.log('Данные вопросов:', data);
        
        if (data.success && data.questions && data.questions.length > 0) {
            // Фильтруем вопросы, чтобы у них были ответы
            const validQuestions = data.questions.filter(q => q.answers && q.answers.length > 0);
            
            if (validQuestions.length === 0) {
                showNoQuestionsMessage();
                showMessage('Вопросы без ответов', 'error');
                return false;
            }
            
            questions = validQuestions;
            console.log(`Загружено ${questions.length} вопросов`);
            showMessage(`Загружено ${questions.length} вопросов`, 'success');
            
            showTestInterface();
            initTest();
            return true;
        } else {
            showNoQuestionsMessage();
            showMessage('Нет вопросов для тестирования', 'error');
            return false;
        }
    } catch (error) {
        console.error('Ошибка загрузки вопросов:', error);
        showNoQuestionsMessage();
        showMessage('Ошибка загрузки вопросов', 'error');
        return false;
    }
}

// Показать сообщение об отсутствии вопросов
function showNoQuestionsMessage() {
    questionSection.style.display = 'none';
    navigationSidebar.style.display = 'none';
    noQuestionsMessage.style.display = 'block';
}

// Показать интерфейс теста
function showTestInterface() {
    noQuestionsMessage.style.display = 'none';
    questionSection.style.display = 'block';
    navigationSidebar.style.display = 'block';
}

// Инициализация теста
function initTest() {
    // Инициализируем объект ответов
    questions.forEach((question, index) => {
        userAnswers[index] = {
            questionId: question.id,
            answerIds: [],
            questionType: question.question_type
        };
    });
    
    // Обновляем UI
    updateNavigation();
    updateQuestion();
    updateStats();
    
    console.log('Тест инициализирован');
}

// Обновление навигации
function updateNavigation() {
    totalQuestions.textContent = `Всего: ${questions.length}`;
    questionsGrid.innerHTML = '';
    
    questions.forEach((_, index) => {
        const button = document.createElement('button');
        button.className = 'question-num';
        button.textContent = index + 1;
        button.dataset.index = index;
        
        if (index === currentQuestionIndex) {
            button.classList.add('current');
        } else if (userAnswers[index] && userAnswers[index].answerIds.length > 0) {
            button.classList.add('answered');
        }
        
        button.addEventListener('click', () => {
            currentQuestionIndex = index;
            updateQuestion();
            updateNavigation();
        });
        
        questionsGrid.appendChild(button);
    });
}

// Обновление текущего вопроса
function updateQuestion() {
    if (questions.length === 0) return;
    
    const question = questions[currentQuestionIndex];
    
    questionText.textContent = question.question_text;
    questionCounter.textContent = `Вопрос ${currentQuestionIndex + 1} из ${questions.length}`;
    competenceBadge.textContent = question.competence;
    
    updateOptions(question);
    
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.disabled = currentQuestionIndex === questions.length - 1;
    
    const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;
    progressFill.style.width = `${progressPercent}%`;
    progressText.textContent = `Вопрос ${currentQuestionIndex + 1} из ${questions.length}`;
}

// Обновление вариантов ответов
function updateOptions(question) {
    optionsList.innerHTML = '';
    
    if (!question.answers || question.answers.length === 0) {
        optionsList.innerHTML = '<p>Нет вариантов ответов</p>';
        return;
    }
    
    const currentAnswer = userAnswers[currentQuestionIndex];
    const selectedAnswers = currentAnswer ? currentAnswer.answerIds : [];
    
    question.answers.forEach(answer => {
        const label = document.createElement('label');
        label.className = 'option-item';
        
        const input = document.createElement('input');
        input.type = question.question_type === 'multiple_choice' ? 'checkbox' : 'radio';
        input.name = 'answer';
        input.value = answer.id;
        
        if (selectedAnswers.includes(answer.id)) {
            input.checked = true;
            label.classList.add('selected');
        }
        
        input.addEventListener('change', () => handleAnswerChange(answer.id, question.question_type));
        
        const span = document.createElement('span');
        span.className = 'option-text';
        span.textContent = answer.answer_text;
        
        label.appendChild(input);
        label.appendChild(span);
        optionsList.appendChild(label);
    });
}

// Обработчик изменения ответа
function handleAnswerChange(answerId, questionType) {
    const currentAnswer = userAnswers[currentQuestionIndex];
    
    if (questionType === 'single_choice') {
        currentAnswer.answerIds = [answerId];
        
        document.querySelectorAll('input[name="answer"]').forEach(input => {
            const label = input.closest('.option-item');
            if (input.value !== answerId.toString()) {
                input.checked = false;
                label.classList.remove('selected');
            } else {
                label.classList.add('selected');
            }
        });
    } else {
        const index = currentAnswer.answerIds.indexOf(answerId);
        if (index === -1) {
            currentAnswer.answerIds.push(answerId);
        } else {
            currentAnswer.answerIds.splice(index, 1);
        }
        
        const input = document.querySelector(`input[value="${answerId}"]`);
        const label = input.closest('.option-item');
        if (input.checked) {
            label.classList.add('selected');
        } else {
            label.classList.remove('selected');
        }
    }
    
    updateStats();
    updateNavigation();
}

// Обновление статистики
function updateStats() {
    const answered = Object.values(userAnswers).filter(answer => 
        answer.answerIds.length > 0
    ).length;
    
    answeredCount.textContent = `Отвечено: ${answered}`;
}

// Отправка результатов теста на сервер
async function submitTest() {
    try {
        const token = localStorage.getItem('expert_test_token');
        
        if (!token) {
            showMessage('Ошибка авторизации', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        // Формируем данные для отправки
        const testData = {
            answers: Object.values(userAnswers)
                .filter(answer => answer.answerIds.length > 0)
                .map(answer => ({
                    questionId: answer.questionId,
                    answerIds: answer.answerIds
                })),
            questions: questions.map(q => ({
                id: q.id,
                question_text: q.question_text,
                competence: q.competence,
                question_type: q.question_type
            }))
        };
        
        console.log('Отправляем результаты:', testData);
        showMessage('Отправка результатов...', 'info');
        
        // Отправляем результаты на сервер
        const response = await fetch(`${API_URL}/results/save`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        console.log('📥 Ответ сервера:', response.status);
        
        if (response.status === 401) {
            showMessage('Сессия истекла', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        const data = await response.json();
        console.log('Данные ответа:', data);
        
        if (data.success) {
            showMessage('Тест завершен! Результаты сохранены.', 'success');
            
            // Сохраняем ID результата для дальнейшего использования
            if (data.testResultId) {
                localStorage.setItem('lastTestResultId', data.testResultId);
            }
            
            // Переходим на страницу результатов через 2 секунды
            setTimeout(() => {
                window.location.href = 'results.html';
            }, 2000);
            
        } else {
            showMessage(`Ошибка: ${data.message}`, 'error');
        }
        
    } catch (error) {
        console.error('Ошибка отправки результатов:', error);
        showMessage('Ошибка при сохранении результатов', 'error');
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Инициализация страницы теста...');
    
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;
    
    await loadQuestions();
    
    // Обработчики кнопок навигации
    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            updateQuestion();
            updateNavigation();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            updateQuestion();
            updateNavigation();
        }
    });
    
    // Обработчик кнопки завершения теста
    submitTestBtn.addEventListener('click', () => {
        const answeredCount = Object.values(userAnswers).filter(answer => 
            answer.answerIds.length > 0
        ).length;
        
        const totalQuestionsCount = questions.length;
        const unansweredCount = totalQuestionsCount - answeredCount;
        
        if (unansweredCount > 0) {
            modalMessage.innerHTML = `
                <p>Вы ответили на <strong>${answeredCount}</strong> из <strong>${totalQuestionsCount}</strong> вопросов.</p>
                <p>Осталось <strong>${unansweredCount}</strong> вопросов без ответа.</p>
                <p style="margin-top: 10px; color: #4c7aaf;">Завершить тест сейчас?</p>
            `;
        } else {
            modalMessage.innerHTML = `
                <p>Вы ответили на все <strong>${totalQuestionsCount}</strong> вопросов!</p>
                <p style="margin-top: 10px; color: #4c7aaf;"Завершить тест?</p>
            `;
        }
        
        confirmModal.style.display = 'flex';
    });
    
    // Обработчики модального окна
    confirmSubmitBtn.addEventListener('click', () => {
        confirmModal.style.display = 'none';
        submitTest();
    });
    
    cancelSubmitBtn.addEventListener('click', () => {
        confirmModal.style.display = 'none';
    });
    
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            confirmModal.style.display = 'none';
        }
    });
    
    // Горячие клавиши
    document.addEventListener('keydown', (e) => {
        if (questions.length === 0) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                if (currentQuestionIndex > 0) {
                    currentQuestionIndex--;
                    updateQuestion();
                    updateNavigation();
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (currentQuestionIndex < questions.length - 1) {
                    currentQuestionIndex++;
                    updateQuestion();
                    updateNavigation();
                }
                break;
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
                e.preventDefault();
                const answerIndex = parseInt(e.key) - 1;
                const question = questions[currentQuestionIndex];
                if (question.answers && question.answers[answerIndex]) {
                    const answerId = question.answers[answerIndex].id;
                    handleAnswerChange(answerId, question.question_type);
                    updateOptions(question);
                }
                break;
            case 'Enter':
                if (currentQuestionIndex < questions.length - 1) {
                    currentQuestionIndex++;
                    updateQuestion();
                    updateNavigation();
                }
                break;
        }
    });
    
    console.log('Страница теста готова');
});