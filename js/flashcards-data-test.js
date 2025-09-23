class DataManager {
  static STORAGE_KEY = "wordLearningAppData";

  static defaultData = {
    cards: [],
    categories: ["Загальні", "Робота", "Подорожі", "Їжа", "Технології"],
    version: "2.0",
    settings: {
      ttsEnabled: true,
      audioAttempts: 2,
      reviewInterval: 24,
    },
    statistics: {
      totalStudied: 0,
      totalRemembered: 0,
      totalReviews: 0,
      lastStudySession: null,
    },
  };

  static initialize() {
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      this.saveData(this.defaultData);
    }
    return this.loadData();
  }

  static loadData() {
    try {
      const data =
        JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || this.defaultData;

      // Міграція старих даних
      if (!data.version || data.version === "1.0") {
        data.cards = data.cards.map((card) => this.migrateCard(card));
        data.version = "2.0";

        // Ініціалізація статистики для старих даних
        if (!data.statistics) {
          data.statistics = {
            totalStudied: 0,
            totalRemembered: 0,
            totalReviews: 0,
            lastStudySession: null,
          };
        }

        this.saveData(data);
      }

      return data;
    } catch (error) {
      console.error("Помилка завантаження даних:", error);
      return this.defaultData;
    }
  }

  static migrateCard(card) {
    if (!card.id) card.id = this.generateId();
    if (!card.createdAt) card.createdAt = new Date().toISOString();

    // Міграція прогресу
    if (!card.progress) {
      card.progress = {
        level: 0,
        nextReview: new Date().toISOString(),
        lastReviewed: null,
        correctAnswers: 0,
        totalAnswers: 0,
        successRate: 0,
      };
    }

    // Міграція аудіо налаштувань
    if (!card.audioConfig) {
      card.audioConfig = {
        ttsEnabled: !card.audioUrl, // TTS увімкнено, якщо немає зовнішнього аудіо
        source: card.audioUrl ? "external" : "tts",
        url: card.audioUrl || null,
      };
    }

    // Міграція системи інтервальних повторень
    if (!card.spacedRepetition) {
      card.spacedRepetition = {
        interval: 1,
        easeFactor: 2.5,
        repetition: 0,
        nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        lastInterval: 0,
        stability: 0,
      };
    }

    // Видалення зайвих полів
    delete card.audioUrl;

    return card;
  }

  static saveData(data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Помилка збереження даних:", error);
      return false;
    }
  }

  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Робота з картками
  static createCard(cardData) {
    const data = this.loadData();

    const newCard = {
      id: this.generateId(),
      english: cardData.english,
      transcription: cardData.transcription || "",
      ukrainian: cardData.ukrainian,
      example1: cardData.example1 || "",
      example2: cardData.example2 || "",
      imageUrl: cardData.imageUrl || "",
      category: cardData.category || "Загальні",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      // Аудіо конфігурація - TTS тільки якщо немає зовнішнього аудіо
      audioConfig: {
        ttsEnabled: !cardData.audioUrl,
        source: cardData.audioUrl ? "external" : "tts",
        url: cardData.audioUrl || null,
      },

      // Прогрес вивчення
      progress: {
        level: 0,
        nextReview: new Date().toISOString(),
        lastReviewed: null,
        correctAnswers: 0,
        totalAnswers: 0,
        successRate: 0,
      },

      // Система інтервальних повторень
      spacedRepetition: {
        interval: 1,
        easeFactor: 2.5,
        repetition: 0,
        nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        lastInterval: 0,
        stability: 0,
      },

      // Метадані
      metadata: {
        createdWithTTS: !cardData.audioUrl,
        lastModified: new Date().toISOString(),
      },
    };

    data.cards.push(newCard);

    // Додаємо нову категорію, якщо потрібно
    if (!data.categories.includes(newCard.category)) {
      data.categories.push(newCard.category);
      data.categories.sort();
    }

    this.saveData(data);
    return newCard;
  }

  static updateCard(updatedCard) {
    const data = this.loadData();
    const index = data.cards.findIndex((card) => card.id === updatedCard.id);

    if (index !== -1) {
      const oldCategory = data.cards[index].category;
      const hasExternalAudio = !!updatedCard.audioUrl;

      data.cards[index] = {
        ...data.cards[index],
        english: updatedCard.english,
        transcription: updatedCard.transcription || "",
        ukrainian: updatedCard.ukrainian,
        example1: updatedCard.example1 || "",
        example2: updatedCard.example2 || "",
        imageUrl: updatedCard.imageUrl || "",
        category: updatedCard.category,
        updatedAt: new Date().toISOString(),

        // Оновлення аудіо конфігурації
        audioConfig: {
          ttsEnabled: !hasExternalAudio,
          source: hasExternalAudio ? "external" : "tts",
          url: updatedCard.audioUrl || null,
        },

        metadata: {
          ...data.cards[index].metadata,
          lastModified: new Date().toISOString(),
          createdWithTTS: !hasExternalAudio,
        },
      };

      // Оновлюємо категорії, якщо потрібно
      if (!data.categories.includes(updatedCard.category)) {
        data.categories.push(updatedCard.category);
        data.categories.sort();
      }

      // Видаляємо стару категорію, якщо вона більше не використовується
      if (oldCategory !== updatedCard.category) {
        const isCategoryUsed = data.cards.some(
          (card) => card.category === oldCategory && card.id !== updatedCard.id
        );
        if (!isCategoryUsed && oldCategory !== "Загальні") {
          data.categories = data.categories.filter(
            (cat) => cat !== oldCategory
          );
        }
      }

      this.saveData(data);
      return true;
    }
    return false;
  }

  static deleteCard(cardId) {
    const data = this.loadData();
    const cardIndex = data.cards.findIndex((card) => card.id === cardId);

    if (cardIndex !== -1) {
      const category = data.cards[cardIndex].category;
      data.cards.splice(cardIndex, 1);

      // Перевіряємо, чи категорія ще використовується
      const isCategoryUsed = data.cards.some(
        (card) => card.category === category
      );
      if (!isCategoryUsed && category !== "Загальні") {
        data.categories = data.categories.filter((cat) => cat !== category);
      }

      this.saveData(data);
      return true;
    }
    return false;
  }

  // Додати в клас DataManager
  static deleteCategory(categoryName) {
    const data = this.loadData();

    // Перевіряємо, чи категорія існує
    if (!data.categories.includes(categoryName)) {
      return { success: false, message: "Категорія не знайдена" };
    }

    // Перевіряємо, чи є картки в цій категорії
    const cardsInCategory = data.cards.filter(
      (card) => card.category === categoryName
    );
    if (cardsInCategory.length > 0) {
      return {
        success: false,
        message: `Неможливо видалити категорію. В ній є ${cardsInCategory.length} карток. Спочатку перемістіть або видаліть ці картки.`,
      };
    }

    // Видаляємо категорію
    data.categories = data.categories.filter((cat) => cat !== categoryName);

    if (this.saveData(data)) {
      return { success: true, message: "Категорію успішно видалено" };
    } else {
      return { success: false, message: "Помилка при збереженні даних" };
    }
  }

  // Метод для переміщення карток між категоріями
  static moveCardsToCategory(fromCategory, toCategory) {
    const data = this.loadData();

    const cardsToMove = data.cards.filter(
      (card) => card.category === fromCategory
    );
    cardsToMove.forEach((card) => {
      card.category = toCategory;
      card.updatedAt = new Date().toISOString();
    });

    return this.saveData(data);
  }

  static getCardsForStudy(category = "all", mode = "normal") {
    const data = this.loadData();
    let cards = data.cards;

    // Фільтрація по категорії
    if (category !== "all") {
      cards = cards.filter((card) => card.category === category);
    }

    // Фільтрація по режиму
    const now = new Date();
    switch (mode) {
      case "review":
        cards = cards.filter(
          (card) => new Date(card.spacedRepetition.nextReview) <= now
        );
        break;
      case "difficult":
        cards = cards.filter((card) => {
          const successRate =
            card.progress.totalAnswers > 0
              ? card.progress.correctAnswers / card.progress.totalAnswers
              : 1;
          return successRate < 0.5;
        });
        break;
    }

    // Перемішування карток
    return this.shuffleArray(cards);
  }

  static shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  static updateCardProgress(cardId, remembered) {
    const data = this.loadData();
    const card = data.cards.find((c) => c.id === cardId);

    if (card) {
      const now = new Date();

      // Оновлення прогресу
      card.progress.totalAnswers++;
      if (remembered) {
        card.progress.correctAnswers++;
        card.progress.level = Math.min(card.progress.level + 1, 5);
      } else {
        card.progress.level = Math.max(card.progress.level - 1, 0);
      }
      card.progress.successRate = Math.round(
        (card.progress.correctAnswers / card.progress.totalAnswers) * 100
      );
      card.progress.lastReviewed = now.toISOString();

      // Оновлення системи інтервальних повторень
      this.updateSpacedRepetition(card, remembered);

      // Оновлення загальної статистики
      data.statistics.totalStudied++;
      if (remembered) {
        data.statistics.totalRemembered++;
      }
      data.statistics.totalReviews++;
      data.statistics.lastStudySession = now.toISOString();

      this.saveData(data);
      return true;
    }
    return false;
  }

  static updateSpacedRepetition(card, remembered) {
    const sr = card.spacedRepetition;
    const intervals = [1, 3, 7, 14, 30]; // днів

    if (remembered) {
      if (sr.repetition === 0) {
        sr.interval = intervals[0];
      } else if (sr.repetition === 1) {
        sr.interval = intervals[1];
      } else {
        sr.interval = Math.round(sr.interval * sr.easeFactor);
      }
      sr.repetition++;
      sr.easeFactor = Math.max(1.3, sr.easeFactor + 0.1);
    } else {
      sr.repetition = Math.max(0, sr.repetition - 1);
      sr.interval = Math.max(1, Math.round(sr.interval * 0.5));
      sr.easeFactor = Math.max(1.3, sr.easeFactor - 0.2);
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + sr.interval);
    sr.nextReview = nextReview.toISOString();
    sr.lastInterval = sr.interval;
  }

  // Категорії
  static getCategories() {
    const data = this.loadData();
    return data.categories || [];
  }

  static getCardsByCategory(category) {
    const data = this.loadData();
    if (category === "all") return data.cards;
    return data.cards.filter((card) => card.category === category);
  }

  // Статистика
  static getStatistics() {
    const data = this.loadData();
    const cards = data.cards;

    const totalCards = cards.length;
    const dueCards = cards.filter(
      (card) => new Date(card.spacedRepetition.nextReview) <= new Date()
    ).length;

    const totalAnswers = cards.reduce(
      (sum, card) => sum + card.progress.totalAnswers,
      0
    );
    const correctAnswers = cards.reduce(
      (sum, card) => sum + card.progress.correctAnswers,
      0
    );
    const successRate =
      totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

    const totalStudied = cards.filter(
      (card) => card.progress.totalAnswers > 0
    ).length;

    return {
      totalCards,
      dueCards,
      successRate,
      totalStudied,
      totalRemembered: data.statistics.totalRemembered,
      totalReviews: data.statistics.totalReviews,
      lastStudySession: data.statistics.lastStudySession,
    };
  }

  static getCategoryProgress() {
    const data = this.loadData();
    const progress = {};

    data.cards.forEach((card) => {
      if (!progress[card.category]) {
        progress[card.category] = { total: 0, learned: 0 };
      }

      progress[card.category].total++;
      if (card.progress.totalAnswers > 0) {
        progress[card.category].learned++;
      }
    });

    // Розрахунок відсотків
    Object.keys(progress).forEach((category) => {
      const catData = progress[category];
      catData.percentage =
        catData.total > 0
          ? Math.round((catData.learned / catData.total) * 100)
          : 0;
    });

    return progress;
  }

  static resetAllProgress() {
    const data = this.loadData();

    data.cards.forEach((card) => {
      card.progress = {
        level: 0,
        nextReview: new Date().toISOString(),
        lastReviewed: null,
        correctAnswers: 0,
        totalAnswers: 0,
        successRate: 0,
      };

      card.spacedRepetition = {
        interval: 1,
        easeFactor: 2.5,
        repetition: 0,
        nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        lastInterval: 0,
        stability: 0,
      };
    });

    data.statistics = {
      totalStudied: 0,
      totalRemembered: 0,
      totalReviews: 0,
      lastStudySession: null,
    };

    this.saveData(data);
    return true;
  }

  static resetCardIntervals() {
    const data = this.loadData();
    const now = new Date();

    data.cards.forEach((card) => {
      card.spacedRepetition.nextReview = now.toISOString();
      card.spacedRepetition.interval = 1;
    });

    this.saveData(data);
    return true;
  }

  // Імпорт/експорт
  static exportData() {
    const data = this.loadData();
    return JSON.stringify(data, null, 2);
  }

  static importData(jsonData, options = {}) {
    try {
      const importedData = JSON.parse(jsonData);
      const currentData = this.loadData();

      // Об'єднання карток
      if (importedData.cards) {
        importedData.cards.forEach((importedCard) => {
          const existingIndex = currentData.cards.findIndex(
            (card) => card.id === importedCard.id
          );

          if (existingIndex !== -1) {
            // Оновлення існуючої картки
            currentData.cards[existingIndex] = this.mergeCards(
              currentData.cards[existingIndex],
              importedCard,
              options
            );
          } else {
            // Додавання нової картки
            currentData.cards.push(
              this.prepareImportedCard(importedCard, options)
            );
          }
        });
      }

      // Об'єднання категорій
      if (importedData.categories) {
        importedData.categories.forEach((category) => {
          if (!currentData.categories.includes(category)) {
            currentData.categories.push(category);
          }
        });
        currentData.categories.sort();
      }

      // Збереження
      this.saveData(currentData);
      return true;
    } catch (error) {
      console.error("Помилка імпорту даних:", error);
      return false;
    }
  }

  static mergeCards(currentCard, importedCard, options) {
    // Пріоритет новішим даним
    const currentDate = new Date(
      currentCard.updatedAt || currentCard.createdAt
    );
    const importedDate = new Date(
      importedCard.updatedAt || importedCard.createdAt
    );

    if (importedDate > currentDate) {
      return this.prepareImportedCard(importedCard, options);
    }
    return currentCard;
  }

  static prepareImportedCard(card, options) {
    const preparedCard = { ...card };

    // Обробка аудіо налаштувань при імпорті
    if (options.convertAllToTTS) {
      preparedCard.audioConfig = {
        ttsEnabled: true,
        source: "tts",
        url: null,
      };
    } else if (options.keepExternalAudio && card.audioConfig?.url) {
      preparedCard.audioConfig = {
        ttsEnabled: false,
        source: "external",
        url: card.audioConfig.url,
      };
    } else if (!card.audioConfig) {
      // Міграція старих карток
      preparedCard.audioConfig = {
        ttsEnabled: !card.audioUrl,
        source: card.audioUrl ? "external" : "tts",
        url: card.audioUrl || null,
      };
    }

    // Забезпечення наявності всіх необхідних полів
    if (!preparedCard.progress) {
      preparedCard.progress = {
        level: 0,
        nextReview: new Date().toISOString(),
        lastReviewed: null,
        correctAnswers: 0,
        totalAnswers: 0,
        successRate: 0,
      };
    }

    if (!preparedCard.spacedRepetition) {
      preparedCard.spacedRepetition = {
        interval: 1,
        easeFactor: 2.5,
        repetition: 0,
        nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        lastInterval: 0,
        stability: 0,
      };
    }

    if (!preparedCard.metadata) {
      preparedCard.metadata = {
        createdWithTTS: preparedCard.audioConfig.ttsEnabled,
        lastModified: new Date().toISOString(),
      };
    }

    return preparedCard;
  }

  // Допоміжні методи
  static getAllCards() {
    const data = this.loadData();
    return data.cards;
  }

  static getCardById(cardId) {
    const data = this.loadData();
    return data.cards.find((card) => card.id === cardId);
  }

  static getDueCardsCount() {
    const data = this.loadData();
    const now = new Date();
    return data.cards.filter(
      (card) => new Date(card.spacedRepetition.nextReview) <= now
    ).length;
  }

  static getDifficultCards(limit = 20) {
    const data = this.loadData();
    return data.cards
      .filter((card) => card.progress.totalAnswers > 0)
      .sort((a, b) => {
        const aRate = a.progress.correctAnswers / a.progress.totalAnswers;
        const bRate = b.progress.correctAnswers / b.progress.totalAnswers;
        return aRate - bRate;
      })
      .slice(0, limit);
  }
}

// Ініціалізація даних при завантаженні
DataManager.initialize();
