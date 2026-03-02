// sentence-practice.js

let currentSentenceWords = [];
let sentenceHistory = [];

// Функція для генерації випадкових слів для речення
function generateRandomWords() {
    const wordCount = 3; // Кількість слів для речення
    currentSentenceWords = [];

    if (typeof allWords === 'undefined' || allWords.length === 0) {
        console.error('Слова ще не завантажені');
        return;
    }

    // Вибираємо випадкові слова
    const shuffled = [...allWords].sort(() => 0.5 - Math.random());
    currentSentenceWords = shuffled.slice(0, wordCount);

    displaySentenceWords();
}

// Функція для відображення слів для речення
function displaySentenceWords() {
    const container = document.getElementById('sentence-words');
    if (!container) return;

    container.innerHTML = '';

    currentSentenceWords.forEach(item => {
        const wordCard = document.createElement('div');
        wordCard.className = 'word-chip';
        wordCard.innerHTML = `
            <span class="word">${item.word}</span>
            <span class="phonetic">${item.phonetic}</span>
            <span class="translation">${item.translation}</span>
        `;
        container.appendChild(wordCard);
    });
}

// Основна функція перевірки через LanguageTool
async function checkSentence() {
    const sentence = document.getElementById('sentence-input').value.trim();
    const feedbackDiv = document.getElementById('sentence-feedback');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const checkBtn = document.getElementById('checkSentenceBtn');

    if (!sentence) {
        feedbackDiv.innerHTML = '<p class="error">❌ Будь ласка, введіть речення!</p>';
        return;
    }

    // Показуємо індикатор завантаження
    loadingIndicator.style.display = 'block';
    feedbackDiv.innerHTML = '';
    checkBtn.disabled = true;

    try {
        // Викликаємо LanguageTool API (без ключа!)
        const response = await fetch('https://api.languagetool.org/v2/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                text: sentence,
                language: 'en-US',
                enabledOnly: 'false',
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Аналізуємо результат
        displayFeedback(sentence, data);

        // Зберігаємо в історію
        saveToHistory(sentence, data);

        // Показуємо історію
        showHistory();

    } catch (error) {
        console.error('Помилка:', error);
        feedbackDiv.innerHTML = `
            <div class="error-message">
                <p>❌ Помилка при перевірці речення.</p>
                <p>Можливі причини:</p>
                <ul>
                    <li>Немає з'єднання з інтернетом</li>
                    <li>Забагато запитів (ліміт 20/хвилину)</li>
                    <li>Спробуйте пізніше</li>
                </ul>
            </div>
        `;
    } finally {
        loadingIndicator.style.display = 'none';
        checkBtn.disabled = false;
    }
}

// Функція для відображення результатів
function displayFeedback(originalSentence, data) {
    const feedbackDiv = document.getElementById('sentence-feedback');

    // Створюємо HTML з результатами
    let html = '<div class="ai-feedback">';
    html += `<h3>📝 Ваше речення:</h3>`;
    html += `<p class="original-sentence">"${originalSentence}"</p>`;

    // Якщо є помилки
    if (data.matches && data.matches.length > 0) {
        html += `<h3>🔍 Знайдені помилки (${data.matches.length}):</h3>`;

        data.matches.forEach((match, index) => {
            const word = originalSentence.substring(match.offset, match.offset + match.length);
            const context = originalSentence.substring(
                Math.max(0, match.offset - 20),
                Math.min(originalSentence.length, match.offset + match.length + 20)
            );

            html += `<div class="error-item">`;
            html += `<p><strong>Помилка ${index + 1}:</strong> "${word}"</p>`;
            html += `<p class="context">...${context}...</p>`;
            html += `<p>📌 ${match.message}</p>`;

            if (match.replacements && match.replacements.length > 0) {
                const replacements = match.replacements.slice(0, 3).map(r => r.value).join(', ');
                html += `<p>💡 Виправлення: <strong>${replacements}</strong></p>`;
            }

            if (match.rule && match.rule.description) {
                html += `<p class="rule-description">📖 ${match.rule.description}</p>`;
            }
            html += `</div>`;
        });

        // Оцінка на основі кількості помилок
        const grade = calculateGrade(data.matches.length, originalSentence.split(' ').length);
        html += `<div class="grade-section">`;
        html += `<h3>📊 ${grade.emoji} Оцінка: ${grade.level}</h3>`;
        html += `<p>${grade.comment}</p>`;
        html += `</div>`;

    } else {
        // Помилок немає
        html += `<div class="success-message">`;
        html += `<h3>✅ Чудово! Помилок не знайдено.</h3>`;
        html += `<p>Ваше речення граматично правильне. Ви добре справляєтесь!</p>`;
        html += `<p><strong>🏆 Рівень:</strong> Відповідає A2</p>`;
        html += `</div>`;
    }

    // Поради
    html += generateTips(currentSentenceWords);

    html += '</div>';
    feedbackDiv.innerHTML = html;
}

// Функція для розрахунку оцінки
function calculateGrade(errorCount, wordCount) {
    if (errorCount === 0) {
        return {
            emoji: '🏆',
            level: 'A (Відмінно)',
            comment: 'Чудова робота! Речення абсолютно правильне.'
        };
    } else if (errorCount === 1) {
        return {
            emoji: '👍',
            level: 'B (Добре)',
            comment: 'Лише одна помилка. Майже ідеально!'
        };
    } else if (errorCount <= 2) {
        return {
            emoji: '📝',
            level: 'C (Задовільно)',
            comment: 'Є кілька помилок, але загальний зміст зрозумілий.'
        };
    } else {
        return {
            emoji: '💪',
            level: 'D (Потрібна практика)',
            comment: 'Спробуйте ще раз. Зверніть увагу на виправлення вище.'
        };
    }
}

// Функція для генерації порад
function generateTips(words) {
    let tips = '<div class="tips-section">';
    tips += '<h4>💪 Поради для кращого речення:</h4><ul>';

    // Поради на основі слів
    words.forEach(word => {
        tips += `<li>Спробуйте використати "<strong>${word.word}</strong>" в різних часах</li>`;
    });

    tips += `
        <li>Додайте прикметники для опису</li>
        <li>Використовуйте слова з категорії, яку вивчаєте</li>
        <li>Перевірте порядок слів у реченні</li>
    `;

    tips += '</ul></div>';
    return tips;
}

// Функція для збереження в історію
function saveToHistory(sentence, data) {
    const historyItem = {
        sentence: sentence,
        errors: data.matches ? data.matches.length : 0,
        date: new Date().toLocaleString()
    };

    sentenceHistory.unshift(historyItem); // Додаємо на початок
    sentenceHistory = sentenceHistory.slice(0, 10); // Тільки останні 10

    localStorage.setItem('sentenceHistory', JSON.stringify(sentenceHistory));
}

// Функція для показу історії
function showHistory() {
    const historyDiv = document.getElementById('history-section');
    if (!historyDiv) return;

    if (sentenceHistory.length === 0) {
        historyDiv.innerHTML = '<p>📭 Історія порожня</p>';
        return;
    }

    let html = '<h4>📜 Останні спроби:</h4><ul>';
    sentenceHistory.forEach(item => {
        const status = item.errors === 0 ? '✅' : `❌ (${item.errors} помилок)`;
        html += `<li>${item.date}: "${item.sentence}" - ${status}</li>`;
    });
    html += '</ul>';

    historyDiv.innerHTML = html;
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    // Завантажуємо історію
    const saved = localStorage.getItem('sentenceHistory');
    if (saved) {
        sentenceHistory = JSON.parse(saved);
    }

    // Додаємо обробник Enter
    const sentenceInput = document.getElementById('sentence-input');
    if (sentenceInput) {
        sentenceInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                checkSentence();
            }
        });
    }

    // Якщо вкладка практики речень активна при завантаженні, генеруємо слова
    const activeTab = document.querySelector('.tablinks.active');
    if (activeTab && activeTab.getAttribute('onclick').includes('sentence-practice')) {
        generateRandomWords();
    }
});
