// Клас системи тестування
class TestingSystem {
  constructor() {
    this.masteryData = new Map();
    this.testHistory = [];
    this.settings = {
      wordsPerTest: 10,
      levelDistribution: { 3: 20, 4: 40, 5: 40 },
      includeAudio: true,
      includeText: true,
      untestedPeriod: 30,
    };
    this.currentTest = null;
    this.STORAGE_KEY = "wordLearningAppTestingData";

    this.initialize();
  }

  // Ініціалізація даних
  initialize() {
    this.loadTestingData();
  }

  // Завантаження даних тестування
  loadTestingData() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.masteryData = new Map(Object.entries(data.masteryData || {}));
        this.testHistory = data.testHistory || [];
        this.settings = { ...this.settings, ...data.settings };
      }
    } catch (error) {
      console.error("Помилка завантаження даних тестування:", error);
    }
  }

  // Збереження даних тестування
  saveTestingData() {
    try {
      const data = {
        version: "1.0",
        masteryData: Object.fromEntries(this.masteryData),
        testHistory: this.testHistory,
        settings: this.settings,
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Помилка збереження даних тестування:", error);
      return false;
    }
  }

  // Отримання майстерності картки
  getCardMastery(cardId) {
    return (
      this.masteryData.get(cardId) || {
        masteryLevel: 1,
        stability: 0,
        lastTested: null,
        totalTests: 0,
        successfulTests: 0,
      }
    );
  }

  // Оновлення майстерності картки
  updateCardMastery(cardId, isCorrect) {
    const current = this.getCardMastery(cardId);

    current.totalTests++;
    current.lastTested = new Date().toISOString();

    if (isCorrect) {
      current.successfulTests++;

      // ✅ ВИПРАВЛЕННЯ: не збільшуємо стабільність на максимальному рівні
      if (current.masteryLevel < 10) {
        current.stability++;
      }

      // ✅ ВИПРАВЛЕНА ЛОГІКА: підвищуємо рівень кожні 2-3 правильні відповіді
      if (
        current.stability >= this.getStabilityThreshold(current.masteryLevel)
      ) {
        // ✅ ВИПРАВЛЕННЯ: перевіряємо, що ще не досягли максимуму
        if (current.masteryLevel < 10) {
          current.masteryLevel = current.masteryLevel + 1;
          // ✅ НЕ скидаємо стабільність, а зменшуємо її
          current.stability = Math.max(0, current.stability - 2);
        }
        // ✅ Якщо рівень вже X - нічого не робимо зі стабільністю
      }
    } else {
      // ✅ При помилці зменшуємо рівень, але не обов'язково до 0
      current.stability = Math.max(0, current.stability - 2);
      if (current.stability <= 0 && current.masteryLevel > 1) {
        current.masteryLevel = current.masteryLevel - 1;
      }
    }

    this.masteryData.set(cardId, current);
    this.saveTestingData();
    return current;
  }

  // ✅ Додайте цей метод для динамічних порогів стабільності
  getStabilityThreshold(masteryLevel) {
    const thresholds = {
      1: 2, // Для рівня I потрібно 2 правильні відповіді
      2: 2,
      3: 3,
      4: 3,
      5: 4,
      6: 4,
      7: 5, // Для рівня VII потрібно 5 правильних відповідей
      8: 5,
      9: 6,
      10: 6,
    };
    return thresholds[masteryLevel] || 3;
  }

  // Генерація тесту
  generateTest() {
    const allCards = DataManager.getAllCards();

    if (allCards.length === 0) {
      return null;
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(
      now.getTime() - this.settings.untestedPeriod * 24 * 60 * 60 * 1000
    );

    // Розширені критерії відбору карток
    const eligibleCards = allCards.filter((card) => {
      const mastery = this.getCardMastery(card.id);

      // Критерії відбору:
      if (!mastery.lastTested) return true;

      const notTestedRecently = new Date(mastery.lastTested) < thirtyDaysAgo;
      if (notTestedRecently) return true;

      if (mastery.masteryLevel <= 3) return true;

      if (mastery.masteryLevel >= 4 && Math.random() < 0.3) return true;

      return false;
    });

    // Якщо підходящих карток мало, додаємо випадкові картки
    let selectedCards = [];
    if (eligibleCards.length > 0) {
      selectedCards = this.shuffleArray([...eligibleCards]).slice(
        0,
        this.settings.wordsPerTest
      );
    }

    // Якщо все ще недостатньо карток, додаємо будь-які доступні
    if (selectedCards.length < this.settings.wordsPerTest) {
      const remainingNeeded = this.settings.wordsPerTest - selectedCards.length;
      const otherCards = allCards.filter(
        (card) => !selectedCards.some((selected) => selected.id === card.id)
      );

      const additionalCards = this.shuffleArray([...otherCards]).slice(
        0,
        remainingNeeded
      );

      selectedCards = [...selectedCards, ...additionalCards];
    }

    // Якщо все ще немає карток, беремо будь-які доступні
    if (selectedCards.length === 0) {
      selectedCards = this.shuffleArray([...allCards]).slice(
        0,
        Math.min(this.settings.wordsPerTest, allCards.length)
      );
    }

    this.currentTest = {
      id: Date.now().toString(),
      startTime: now.toISOString(),
      cards: selectedCards,
      currentIndex: 0,
      userAnswers: [],
      completed: false,
    };

    return this.currentTest;
  }

  // Перевірка відповіді
  checkAnswer(cardId, userTranslation, userTranscription = "") {
    const card = DataManager.getCardById(cardId);
    if (!card) {
      return {
        isCorrect: false,
        translationCorrect: false,
        transcriptionCorrect: false,
        correctTranslation: "",
        correctTranscription: "",
      };
    }

    // Нормалізація текстів
    const normalizeText = (text) => {
      return text
        .toLowerCase()
        .trim()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .replace(/\s+/g, " ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    };

    const normalizedUserTranslation = normalizeText(userTranslation);
    const normalizedCorrectTranslation = normalizeText(card.ukrainian);

    // Перевірка перекладу
    const translationCorrect =
      normalizedUserTranslation === normalizedCorrectTranslation;

    // Перевірка транскрипції (якщо вказана в картці)
    let transcriptionCorrect = true;
    if (card.transcription && userTranscription) {
      const normalizedUserTranscription = userTranscription
        .replace(/[\/ˈˌ]/g, "")
        .trim();
      const normalizedCorrectTranscription = card.transcription
        .replace(/[\/ˈˌ]/g, "")
        .trim();
      transcriptionCorrect =
        normalizedUserTranscription === normalizedCorrectTranscription;
    }

    const isCorrect = translationCorrect && transcriptionCorrect;

    // Оновлення майстерності
    this.updateCardMastery(cardId, isCorrect);

    return {
      isCorrect,
      translationCorrect,
      transcriptionCorrect,
      correctTranslation: card.ukrainian,
      correctTranscription: card.transcription,
    };
  }

  // Завершення тесту
  completeTest() {
    if (!this.currentTest) return null;

    const endTime = new Date();
    const duration = Math.round(
      (endTime - new Date(this.currentTest.startTime)) / 1000
    );

    const correctAnswers = this.currentTest.userAnswers.filter(
      (answer) => answer.isCorrect
    ).length;
    const totalQuestions = this.currentTest.userAnswers.length;

    const testResult = {
      id: this.currentTest.id,
      date: this.currentTest.startTime,
      totalQuestions,
      correctAnswers,
      duration,
      successRate:
        totalQuestions > 0
          ? Math.round((correctAnswers / totalQuestions) * 100)
          : 0,
      testedCards: this.currentTest.cards.map((card) => card.id),
    };

    this.testHistory.unshift(testResult);
    this.saveTestingData();

    this.currentTest.completed = true;

    return testResult;
  }

  // Статистика тестування
  getTestingStatistics() {
    const totalTests = this.testHistory.length;
    const totalQuestions = this.testHistory.reduce(
      (sum, test) => sum + test.totalQuestions,
      0
    );
    const totalCorrect = this.testHistory.reduce(
      (sum, test) => sum + test.correctAnswers,
      0
    );
    const averageSuccessRate =
      totalTests > 0
        ? Math.round(
            this.testHistory.reduce((sum, test) => sum + test.successRate, 0) /
              totalTests
          )
        : 0;

    // Виправлений підрахунок освоєних слів
    const totalMasteredCards = Array.from(this.masteryData.values()).filter(
      (mastery) => mastery.masteryLevel >= 2
    ).length;

    // Розподіл за рівнями майстерності
    const masteryDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
      9: 0,
      10: 0,
    };
    this.masteryData.forEach((mastery) => {
      const level = Math.min(10, Math.max(1, mastery.masteryLevel));
      masteryDistribution[level]++;
    });

    // Загальна кількість слів, що тестувались
    const totalTestedCards = this.masteryData.size;

    // Середній рівень майстерності
    const averageMasteryLevel =
      totalTestedCards > 0
        ? (
            Array.from(this.masteryData.values()).reduce(
              (sum, mastery) => sum + mastery.masteryLevel,
              0
            ) / totalTestedCards
          ).toFixed(1)
        : 0;

    return {
      totalTests,
      totalQuestions,
      totalCorrect,
      averageSuccessRate,
      masteryDistribution,
      totalMasteredCards,
      totalTestedCards,
      averageMasteryLevel,
    };
  }

  // Експорт даних тестування
  exportTestingData() {
    const data = {
      masteryData: Object.fromEntries(this.masteryData),
      testHistory: this.testHistory,
      settings: this.settings,
      exportDate: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  // Імпорт даних тестування
  importTestingData(jsonData) {
    try {
      const importedData = JSON.parse(jsonData);

      if (importedData.masteryData) {
        this.masteryData = new Map(Object.entries(importedData.masteryData));
      }
      if (importedData.testHistory) {
        this.testHistory = importedData.testHistory;
      }
      if (importedData.settings) {
        this.settings = { ...this.settings, ...importedData.settings };
      }

      this.saveTestingData();
      return true;
    } catch (error) {
      console.error("Помилка імпорту даних тестування:", error);
      return false;
    }
  }

  // Утиліти
  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
}

// Глобальний об'єкт системи тестування
window.testingSystem = new TestingSystem();
