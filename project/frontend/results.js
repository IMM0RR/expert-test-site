// results.js
document.addEventListener('DOMContentLoaded', function() {
    // Элементы DOM
    const testDateEl = document.getElementById('testDate');
    const totalScoreEl = document.getElementById('totalScore');
    const totalQuestionsEl = document.getElementById('totalQuestions');
    const percentageEl = document.getElementById('percentage');
    const completionTimeEl = document.getElementById('completionTime');
    const correctCountEl = document.getElementById('correctCount');
    const incorrectCountEl = document.getElementById('incorrectCount');
    const competenceDetailsEl = document.getElementById('competenceDetails');
    const answersHistoryEl = document.getElementById('answersHistory');
    
    // Chart.js
    let competenceChart = null;
    
    // Получение токена
    function getToken() {
        return localStorage.getItem('expert_test_token') || localStorage.getItem('token');
    }
    
    // Проверка авторизации
    function checkAuth() {
        const token = getToken();
        if (!token) {
            showMessage('Ошибка авторизации. Пожалуйста, войдите снова.', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return false;
        }
        return true;
    }
    
    // Отображение сообщений
    function showMessage(text, type = 'success') {
        const messageEl = document.getElementById('message');
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }
    
    // Загрузка данных результатов
    async function loadResults() {
        if (!checkAuth()) return;
        
        try {
            const token = getToken();
            const response = await fetch( window.location.origin + '/api/results/all', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 401) {
                showMessage('Сессия истекла. Пожалуйста, войдите снова.', 'error');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                return;
            }
            
            const data = await response.json();
            
            if (data.success) {
                if (data.lastTestDetails) {
                    displayLastTestResults(data.lastTestDetails);
                } else {
                    showMessage('У вас еще нет результатов тестирования.', 'info');
                    displayEmptyState();
                }
                
                if (data.testResults && data.testResults.length > 0) {
                    localStorage.setItem('lastTestId', data.testResults[0].id);
                }
            } else {
                showMessage(data.message || 'Ошибка загрузки результатов', 'error');
            }
        } catch (error) {
            console.error('Ошибка загрузки результатов:', error);
            showMessage('Ошибка соединения с сервером', 'error');
        }
    }
    
    // Отображение результатов последнего теста
    function displayLastTestResults(testData) {
        testDateEl.textContent = `Дата прохождения: ${testData.completed_at || 'Неизвестно'}`;
        totalScoreEl.textContent = testData.total_score || 0;
        totalQuestionsEl.textContent = `из ${testData.total_questions || 0} вопросов`;
        percentageEl.textContent = `${testData.percentage || 0}%`;
        
        if (testData.completed_at) {
            const timeParts = testData.completed_at.split(' ');
            if (timeParts.length > 1) {
                completionTimeEl.textContent = timeParts[1];
            } else {
                completionTimeEl.textContent = testData.completed_at;
            }
        }
        
        const correct = testData.total_score || 0;
        const total = testData.total_questions || 0;
        const incorrect = total - correct;
        correctCountEl.textContent = `${correct} правильных`;
        incorrectCountEl.textContent = `${incorrect} неправильных`;
        
        if (testData.competenceResults && testData.competenceResults.length > 0) {
            displayCompetenceDetails(testData.competenceResults);
            createCompetenceChart(testData.competenceResults);
        } else {
            competenceDetailsEl.innerHTML = `
                <div class="empty-state">
                    <p>Нет данных по компетенциям</p>
                </div>
            `;
        }
        
        if (testData.questionHistory && testData.questionHistory.length > 0) {
            displayAnswersHistory(testData.questionHistory);
        } else {
            answersHistoryEl.innerHTML = `
                <div class="empty-state">
                    <p>История ответов пуста</p>
                </div>
            `;
        }
    }
    
    // Отображение деталей по компетенциям
    function displayCompetenceDetails(competences) {
        competenceDetailsEl.innerHTML = '';
        
        competences.forEach(comp => {
            const progress = parseFloat(comp.percentage) || 0;
            
            const compEl = document.createElement('div');
            compEl.className = 'competence-card';
            compEl.innerHTML = `
                <div class="competence-header">
                    <h3>${comp.competence || 'Неизвестная компетенция'}</h3>
                    <span class="competence-percentage">${comp.percentage || 0}%</span>
                </div>
                <div class="competence-stats">
                    <span class="stat">${comp.score || 0} из ${comp.total_questions || 0} правильных</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            `;
            
            competenceDetailsEl.appendChild(compEl);
        });
    }
    
    // Создание диаграммы компетенций
    function createCompetenceChart(competences) {
        const ctx = document.getElementById('competenceChart');
        if (!ctx) return;
        
        const ctx2d = ctx.getContext('2d');
        
        if (competenceChart) {
            competenceChart.destroy();
        }
        
        const labels = competences.map(c => c.competence || 'Неизвестно');
        const data = competences.map(c => parseFloat(c.percentage) || 0);
        
        competenceChart = new Chart(ctx2d, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Результат, %',
                    data: data,
                    backgroundColor: '#1e3a8a',
                    borderColor: '#1e3a8a',
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const comp = competences[context.dataIndex];
                                return [
                                    `Результат: ${context.parsed.y}%`,
                                    `Правильно: ${comp.score || 0} из ${comp.total_questions || 0}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Отображение истории ответов
    function displayAnswersHistory(questions) {
        answersHistoryEl.innerHTML = '';
        
        questions.forEach((q, index) => {
            const isCorrect = q.is_correct;
            const statusClass = isCorrect ? 'status-correct' : 'status-incorrect';
            const statusText = isCorrect ? 'Правильно' : 'Неправильно';
            
            const questionEl = document.createElement('div');
            questionEl.className = 'answer-item';
            
            // Разделяем ответы пользователя и правильные ответы
            const userAnswers = q.user_answers ? q.user_answers.split('; ') : [];
            const correctAnswers = q.correct_answers ? q.correct_answers.split('; ') : [];
            
            questionEl.innerHTML = `
                <div class="answer-header">
                    <div class="question-text">${q.question_text || 'Без текста'}</div>
                    <div class="answer-status ${statusClass}">${statusText}</div>
                </div>
                <div class="answer-details">
                    ${userAnswers.length > 0 ? `
                        <div class="answers-list">
                            ${userAnswers.map(answer => `
                                <div class="user-answer ${isCorrect ? 'correct' : 'incorrect'}">
                                    ${answer}
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p>Нет ответа</p>'}
                    ${!isCorrect && correctAnswers.length > 0 ? `
                        <div style="margin-top: 15px;">
                            <strong>Правильный ответ:</strong>
                            <div class="answers-list" style="margin-top: 5px;">
                                ${correctAnswers.map(answer => `
                                    <div class="correct-answer">
                                        ${answer}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    <div class="competence-badge">${q.competence || 'Общее'}</div>
                </div>
            `;
            
            answersHistoryEl.appendChild(questionEl);
        });
    }
    
    // Отображение состояния "нет результатов"
    function displayEmptyState() {
        competenceDetailsEl.innerHTML = `
            <div class="empty-state">
                <p>Нет данных о результатах</p>
            </div>
        `;
        
        answersHistoryEl.innerHTML = `
            <div class="empty-state">
                <p>История ответов пуста</p>
            </div>
        `;
    }
    
    // Обработчики событий
    document.querySelector('.retake-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'test.html';
    });
    
    document.querySelector('.back-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'profile.html';
    });
    
    // Загрузка при старте
    setTimeout(() => {
        loadResults();
    }, 100);
});