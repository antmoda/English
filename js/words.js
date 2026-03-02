// words.js

let allWords = [];
let currentWordIndex = -1;
let wordScore = 0;
let wordTotalAttempts = 0;
let usedWordIndices = new Set();
let displayedWordsCount = {};
let wordsData = {};

// Функція для відкриття вкладок
function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";

    // Якщо відкриваємо вкладку практики речень, генеруємо слова
    if (tabName === 'sentence-practice' && typeof generateRandomWords === 'function') {
        generateRandomWords();
    }
}

// Функція для завантаження даних з JSON
async function loadWordsData() {
    try {
        const response = await fetch("../json/words_A2.json");
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Помилка завантаження даних:", error);
        return {};
    }
}

// Функція для відображення слів у таблицях
function displayWords(data) {
    wordsData = data;
    allWords = [];

    // Ініціалізуємо лічильники для кожної категорії
    for (const category in data) {
        if (data.hasOwnProperty(category)) {
            displayedWordsCount[category] = 0;

            // Додаємо слова до загального списку
            data[category].forEach((word) => {
                allWords.push({
                    word: word.word,
                    phonetic: word.phonetic,
                    translation: word.translation,
                    category: category,
                });
            });

            // Відображаємо перші 5 слів
            displayWordsInCategory(category, 5);
        }
    }

    // Починаємо практику
    if (allWords.length > 0) {
        nextWord();
    }
}

// Функція для відображення слів у конкретній категорії
function displayWordsInCategory(category, count) {
    const table = document.getElementById(`${category}-table`);
    if (!table || !wordsData[category]) return;

    const tbody = table.querySelector('tbody') || table;
    const startIndex = displayedWordsCount[category];
    const endIndex = Math.min(startIndex + count, wordsData[category].length);

    // Очищаємо таблицю, якщо це перше завантаження
    if (startIndex === 0) {
        tbody.innerHTML = '';
    }

    // Додаємо слова
    for (let i = startIndex; i < endIndex; i++) {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><span class="word">${wordsData[category][i].word}</span></td>
            <td><span class="phonetic">${wordsData[category][i].phonetic}</span></td>
            <td>${wordsData[category][i].translation}</td>
        `;
    }

    // Оновлюємо лічильник
    displayedWordsCount[category] = endIndex;

    // Оновлюємо лічильник слів
    updateWordsCount(category);

    // Оновлюємо кнопку "Показати більше"
    updateShowMoreButton(category);
}

// Функція для оновлення лічильника слів
function updateWordsCount(category) {
    const countElement = document.getElementById(`${category}-count`);
    if (!countElement || !wordsData[category]) return;

    countElement.textContent = `(Показано ${displayedWordsCount[category]} з ${wordsData[category].length} слів)`;
}

// Функція для оновлення стану кнопки "Показати більше"
function updateShowMoreButton(category) {
    const buttonContainer = document.getElementById(`${category}-show-more`);
    if (!buttonContainer || !wordsData[category]) return;

    if (displayedWordsCount[category] >= wordsData[category].length) {
        buttonContainer.style.display = "none";
    } else {
        buttonContainer.style.display = "block";
        const btn = buttonContainer.querySelector(".sound-btn");
        const remaining = wordsData[category].length - displayedWordsCount[category];
        btn.textContent = `Показати ще ${Math.min(5, remaining)} слів`;
    }
}

// Функція для показу більше слів
function showMore(category) {
    displayWordsInCategory(category, 5);
}

// Функція для отримання випадкового індексу слова
function getRandomWordIndex() {
    if (usedWordIndices.size >= allWords.length) {
        usedWordIndices.clear();
    }

    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * allWords.length);
    } while (usedWordIndices.has(randomIndex));

    usedWordIndices.add(randomIndex);
    return randomIndex;
}

// Функція для перевірки відповіді
function checkWordAnswer() {
    const input = document.getElementById("translation-input").value.trim().toLowerCase();
    const correctAnswer = allWords[currentWordIndex].translation.toLowerCase();
    const feedback = document.getElementById("word-feedback");

    wordTotalAttempts++;
    document.getElementById("word-total").textContent = wordTotalAttempts;

    if (input === correctAnswer) {
        feedback.innerHTML = "✅ Правильно! Відмінно!";
        feedback.style.color = "green";
        wordScore++;
        document.getElementById("word-score").textContent = wordScore;
    } else {
        feedback.innerHTML = "❌ Неправильно. Правильна відповідь: " + allWords[currentWordIndex].translation;
        feedback.style.color = "red";
    }

    // Оновлення прогресу
    const progressBar = document.getElementById("word-progress-bar");
    if (wordTotalAttempts > 0) {
        progressBar.style.width = (wordScore / wordTotalAttempts * 100) + "%";
    }
}

// Функція для наступного слова
function nextWord() {
    if (allWords.length === 0) return;

    currentWordIndex = getRandomWordIndex();
    document.getElementById("practice-word").textContent = allWords[currentWordIndex].word;
    document.getElementById("practice-phonetic").textContent = allWords[currentWordIndex].phonetic;
    document.getElementById("translation-input").value = "";
    document.getElementById("word-feedback").innerHTML = "";
}

// Ініціалізація при завантаженні сторінки
document.addEventListener("DOMContentLoaded", async function () {
    const data = await loadWordsData();
    displayWords(data);

    document.getElementById("word-total").textContent = wordTotalAttempts;
    document.getElementById("word-score").textContent = wordScore;
});
