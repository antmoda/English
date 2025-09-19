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
}

// Змінні для практики
let wordScore = 0;
let wordTotalAttempts = 0;
let allWords = [];
let displayedWordsCount = {}; // Для відстеження кількості відображених слів по категоріях
let usedWordIndices = new Set(); // Для відстеження вже використаних слів
let currentWordIndex = -1; // Поточний індекс слова для практики

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
  // Зберігаємо всі слова для практики
  allWords = [];

  // Ініціалізуємо лічильники відображених слів для кожної категорії
  for (const category in data) {
    if (data.hasOwnProperty(category)) {
      displayedWordsCount[category] = 0;
    }
  }

  // Відображаємо слова по категоріях
  for (const category in data) {
    if (data.hasOwnProperty(category)) {
      const table = document.getElementById(`${category}-table`);
      if (table) {
        const words = data[category];

        // Додаємо слова до загального списку для практики
        words.forEach((word) => {
          allWords.push({
            word: word.word,
            phonetic: word.phonetic,
            translation: word.translation,
            category: category,
          });
        });

        // Відображаємо перші 20 слів або менше, якщо слів менше
        displayWordsInCategory(category, 5);
      }
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
  const data = window.wordsData[category];

  if (!table || !data) return;

  // Очищаємо таблицю, залишаючи лише заголовок
  while (table.rows.length > 1) {
    table.deleteRow(1);
  }

  // Відображаємо слова
  const endIndex = Math.min(displayedWordsCount[category] + count, data.length);

  for (let i = 0; i < endIndex; i++) {
    const row = table.insertRow();
    const cell1 = row.insertCell(0);
    const cell2 = row.insertCell(1);
    const cell3 = row.insertCell(2);

    cell1.innerHTML = `<span class="word">${data[i].word}</span>`;
    cell2.innerHTML = `<span class="phonetic">${data[i].phonetic}</span>`;
    cell3.textContent = data[i].translation;
  }

  // Оновлюємо лічильник
  displayedWordsCount[category] = endIndex;

  // Оновлюємо кнопку "Показати більше"
  updateShowMoreButton(category);

  // Оновлюємо лічильник слів
  updateWordsCount(category);
}

// Функція для оновлення лічильника слів
function updateWordsCount(category) {
  const countElement = document.getElementById(`${category}-count`);
  const data = window.wordsData[category];

  if (!countElement || !data) return;

  countElement.textContent = `Показано ${displayedWordsCount[category]} з ${data.length} слів`;
}

// Функція для оновлення стану кнопки "Показати більше"
function updateShowMoreButton(category) {
  const buttonContainer = document.querySelector(
    `#${category} .show-more-container`
  );
  const data = window.wordsData[category];

  if (!buttonContainer || !data) return;

  if (displayedWordsCount[category] >= data.length) {
    // Усі слова вже показані, ховаємо кнопку
    buttonContainer.style.display = "none";
  } else {
    // Є ще слова, показуємо кнопку
    buttonContainer.style.display = "block";

    // Оновлюємо текст кнопки
    const remaining = data.length - displayedWordsCount[category];
    const btn = buttonContainer.querySelector(".sound-btn");
    btn.textContent = `Показати ще ${Math.min(5, remaining)} слів`;
  }
}

// Функція для показу більше слів
function showMore(category) {
  displayWordsInCategory(category, 5);
}

// Функція для отримання випадкового індексу слова
function getRandomWordIndex() {
  // Якщо всі слова вже були використані, очищаємо множину
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
  const input = document
    .getElementById("translation-input")
    .value.trim()
    .toLowerCase();
  const correctAnswer = allWords[currentWordIndex].translation.toLowerCase();
  const feedback = document.getElementById("word-feedback");

  wordTotalAttempts++;
  document.getElementById("word-total").textContent = wordTotalAttempts;

  if (input === correctAnswer) {
    feedback.innerHTML = "Правильно! Відмінно!";
    feedback.style.color = "var(--success)";
    wordScore++;
    document.getElementById("word-score").textContent = wordScore;
  } else {
    feedback.innerHTML =
      "Неправильно. Правильна відповідь: " +
      allWords[currentWordIndex].translation;
    feedback.style.color = "var(--accent)";
  }

  // Оновлення прогресу
  const progressBar = document.getElementById("word-progress-bar");
  progressBar.style.width = (wordScore / wordTotalAttempts) * 100 + "%";
}

// Функція для наступного слова
function nextWord() {
  currentWordIndex = getRandomWordIndex();
  document.getElementById("practice-word").textContent =
    allWords[currentWordIndex].word;
  document.getElementById("practice-phonetic").textContent =
    allWords[currentWordIndex].phonetic;
  document.getElementById("translation-input").value = "";
  document.getElementById("word-feedback").innerHTML = "";
}

// Ініціалізація при завантаженні сторінки
document.addEventListener("DOMContentLoaded", async function () {
  window.wordsData = await loadWordsData();
  displayWords(window.wordsData);

  document.getElementById("word-total").textContent = wordTotalAttempts;
  document.getElementById("word-score").textContent = wordScore;
});
