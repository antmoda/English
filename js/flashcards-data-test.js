class DataManager {
  static STORAGE_KEY = "wordLearningAppData";
  static storageLimit = null;
  static debouncedSave = null;
  static isStorageInitialized = false;

  static defaultData = {
    cards: [],
    categories: ["Загальні", "Робота", "Подорожі", "Їжа", "Технології"],
    version: "3.1", // Оновлена версія
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

  // Спрощена ініціалізація сховища
  static async initializeStorage() {
    if (this.isStorageInitialized) return;
    this.isStorageInitialized = true;
  }

  static async initialize() {
    await this.initializeStorage();

    if (!localStorage.getItem(this.STORAGE_KEY)) {
      this.saveDataImmediately(this.defaultData);
    }

    return this.loadData();
  }

  // ВИПРАВЛЕНИЙ МЕТОД: Реальне вимірювання сховища
  static getRealStorageStats() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      const currentSize = data ? new Blob([data]).size : 0;

      // Реальні ліміти LocalStorage для різних браузерів
      const getStorageLimit = () => {
        const userAgent = navigator.userAgent.toLowerCase();

        if (userAgent.includes("chrome") || userAgent.includes("chromium")) {
          return 10 * 1024 * 1024; // 10MB для Chrome
        } else if (userAgent.includes("firefox")) {
          return 10 * 1024 * 1024; // 10MB для Firefox
        } else if (
          userAgent.includes("safari") &&
          !userAgent.includes("chrome")
        ) {
          return 5 * 1024 * 1024; // 5MB для Safari
        } else if (userAgent.includes("edge")) {
          return 10 * 1024 * 1024; // 10MB для Edge
        } else {
          return 5 * 1024 * 1024; // 5MB за замовчуванням
        }
      };

      const storageLimit = getStorageLimit();
      const usagePercentage = Math.min(100, (currentSize / storageLimit) * 100);
      const remaining = Math.max(0, storageLimit - currentSize);

      return {
        currentSize,
        currentSizeKB: Math.round(currentSize / 1024),
        currentSizeMB: (currentSize / (1024 * 1024)).toFixed(2),
        limit: storageLimit,
        limitMB: (storageLimit / (1024 * 1024)).toFixed(2),
        usagePercentage: Math.round(usagePercentage),
        cardsCount: this.loadData().cards.length,
        categoriesCount: this.loadData().categories.length,
        isNearLimit: usagePercentage > 80,
        isCritical: usagePercentage > 95,
        remaining: remaining,
        remainingKB: Math.round(remaining / 1024),
        remainingMB: (remaining / (1024 * 1024)).toFixed(2),
        safeToAdd: remaining > 100 * 1024,
      };
    } catch (error) {
      console.error("Помилка отримання статистики сховища:", error);
      return this.getFallbackStats();
    }
  }

  static loadData() {
    try {
      const data =
        JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || this.defaultData;

      // Безпечна міграція даних
      if (
        !data.version ||
        data.version === "1.0" ||
        data.version === "2.0" ||
        data.version === "3.0"
      ) {
        data.cards = data.cards.map((card) => this.migrateCard(card));
        data.version = "3.1";

        if (!data.statistics) {
          data.statistics = { ...this.defaultData.statistics };
        }

        this.saveDataImmediately(data);
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

    if (!card.audioConfig) {
      card.audioConfig = {
        ttsEnabled: !card.audioUrl,
        source: card.audioUrl ? "external" : "tts",
        url: card.audioUrl || null,
      };
    }

    // Оновлена міграція для SM-2 алгоритму
    if (!card.spacedRepetition || !card.spacedRepetition.algorithm) {
      card.spacedRepetition = {
        algorithm: "sm2",
        interval: card.spacedRepetition?.interval || 1,
        easeFactor: card.spacedRepetition?.easeFactor || 2.5,
        repetition: card.spacedRepetition?.repetition || 0,
        nextReview:
          card.spacedRepetition?.nextReview ||
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        lastInterval: card.spacedRepetition?.lastInterval || 0,
        stability: card.spacedRepetition?.stability || 0,
        difficulty: card.spacedRepetition?.difficulty || 2.5,
        consecutiveCorrect: card.spacedRepetition?.consecutiveCorrect || 0,
      };
    }

    delete card.audioUrl;
    return card;
  }

  // ВИПРАВЛЕНИЙ МЕТОД: Безпечне збереження
  static saveData(data, isCritical = false) {
    // Для критичних даних (прогрес, видалення) - зберігаємо негайно
    if (isCritical) {
      return this.saveDataImmediately(data);
    }

    // Для не критичних даних - використовуємо дебаунс
    if (this.debouncedSave) {
      clearTimeout(this.debouncedSave);
    }

    return new Promise((resolve) => {
      this.debouncedSave = setTimeout(() => {
        const success = this.saveDataImmediately(data);
        resolve(success);
      }, 1000);
    });
  }

  static saveDataImmediately(data) {
    try {
      // Спрощення даних при необхідності
      const simplifiedData = this.simplifyDataForStorage(data);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(simplifiedData));

      // Додаткова перевірка, що дані збереглися
      const savedData = localStorage.getItem(this.STORAGE_KEY);
      if (!savedData) {
        throw new Error("Дані не збереглися після запису");
      }

      console.log("Дані успішно збережено");
      return true;
    } catch (error) {
      console.error("Помилка збереження даних:", error);
      this.handleStorageError(data, error);
      return false;
    }
  }

  // НОВИЙ МЕТОД: Спрощення даних для сховища
  static simplifyDataForStorage(data) {
    // Якщо сховище майже заповнене, спрощуємо дані
    const stats = this.getRealStorageStats();

    if (stats.isNearLimit) {
      return {
        ...data,
        cards: data.cards.map((card) => ({
          id: card.id,
          english: card.english,
          ukrainian: card.ukrainian,
          transcription: card.transcription,
          category: card.category,
          progress: card.progress,
          spacedRepetition: card.spacedRepetition,
          example1: card.example1 ? card.example1.substring(0, 200) : "",
          example2: card.example2 ? card.example2.substring(0, 200) : "",
          imageUrl: "",
          frontImageUrl: "",
          audioConfig: {
            ttsEnabled: true,
            source: "tts",
            url: null,
          },
          metadata: {
            createdWithTTS: true,
            lastModified: new Date().toISOString(),
            simplified: true,
          },
        })),
      };
    }

    return data;
  }

  static handleStorageError(data, error) {
    try {
      const simplifiedData = {
        ...data,
        cards: data.cards.map((card) => ({
          id: card.id,
          english: card.english,
          ukrainian: card.ukrainian,
          transcription: card.transcription,
          category: card.category,
          progress: card.progress,
          spacedRepetition: card.spacedRepetition,
          example1: card.example1 ? card.example1.substring(0, 100) : "",
          example2: card.example2 ? card.example2.substring(0, 100) : "",
          imageUrl: "",
          frontImageUrl: "",
          audioConfig: { ttsEnabled: true, source: "tts", url: null },
        })),
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(simplifiedData));
      console.warn("Дані спрощено для збереження через нестачу місця");
    } catch (e) {
      console.error("Критична помилка збереження:", e);
    }
  }

  static isValidUrl(string) {
    if (!string || string.trim() === "") return false;
    try {
      const url = new URL(string);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
      return false;
    }
  }

  static canAddMoreCards(estimatedNewCards = 1) {
    try {
      const stats = this.getRealStorageStats();
      const estimatedSize = estimatedNewCards * 2000;

      return {
        canAdd: stats.remaining > estimatedSize && !stats.isCritical,
        currentSize: stats.currentSize,
        limit: stats.limit,
        remaining: stats.remaining,
        estimatedNewSize: estimatedSize,
        willExceed: stats.remaining <= estimatedSize,
        safeToAdd: stats.safeToAdd,
        recommendation: stats.isCritical
          ? "Сховище майже заповнено! Експортуйте дані."
          : stats.isNearLimit
          ? "Сховище заповнюється. Будьте обережні."
          : "Сховище у нормі.",
      };
    } catch (error) {
      return {
        canAdd: true,
        currentSize: 0,
        limit: 0,
        remaining: 0,
        estimatedNewSize: 0,
        willExceed: false,
        safeToAdd: true,
        recommendation: "Не вдалося перевірити сховище",
      };
    }
  }

  static getStorageStats() {
    return this.getRealStorageStats();
  }

  static getFallbackStats() {
    const data = this.loadData();
    return {
      currentSize: 0,
      currentSizeKB: 0,
      currentSizeMB: "0",
      limit: 0,
      limitMB: "0",
      usagePercentage: 0,
      cardsCount: data.cards.length,
      categoriesCount: data.categories.length,
      isNearLimit: false,
      isCritical: false,
      remainingKB: 0,
      remainingMB: "0",
    };
  }

  static createCard(cardData) {
    try {
      if (cardData.audioUrl && !this.isValidUrl(cardData.audioUrl)) {
        throw new Error("Невірний URL для аудіо");
      }
      if (cardData.imageUrl && !this.isValidUrl(cardData.imageUrl)) {
        throw new Error("Невірний URL для зображення");
      }
      if (cardData.frontImageUrl && !this.isValidUrl(cardData.frontImageUrl)) {
        throw new Error("Невірний URL для фронтального зображення");
      }

      const limitCheck = this.canAddMoreCards();
      if (!limitCheck.safeToAdd) {
        const stats = this.getRealStorageStats();
        throw new Error(
          `Не вдається додати картку. Сховище заповнено на ${stats.usagePercentage}%.\n` +
            `Використано: ${stats.currentSizeMB} MB / Ліміт: ${stats.limitMB} MB\n` +
            `Залишилось місця: ${stats.remainingMB} MB`
        );
      }

      const data = this.loadData();

      const newCard = {
        id: this.generateId(),
        english: cardData.english,
        transcription: cardData.transcription || "",
        ukrainian: cardData.ukrainian,
        example1: cardData.example1 || "",
        example2: cardData.example2 || "",
        imageUrl: cardData.imageUrl || "",
        frontImageUrl: cardData.frontImageUrl || "",
        category: cardData.category || "Загальні",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        audioConfig: {
          ttsEnabled: !cardData.audioUrl,
          source: cardData.audioUrl ? "external" : "tts",
          url: cardData.audioUrl || null,
        },

        progress: {
          level: 0,
          nextReview: new Date().toISOString(),
          lastReviewed: null,
          correctAnswers: 0,
          totalAnswers: 0,
          successRate: 0,
        },

        spacedRepetition: {
          algorithm: "sm2",
          interval: 1,
          easeFactor: 2.5,
          repetition: 0,
          nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          lastInterval: 0,
          stability: 0,
          difficulty: 2.5,
          consecutiveCorrect: 0,
        },

        metadata: {
          createdWithTTS: !cardData.audioUrl,
          lastModified: new Date().toISOString(),
        },
      };

      data.cards.push(newCard);

      if (!data.categories.includes(newCard.category)) {
        data.categories.push(newCard.category);
        data.categories.sort();
      }

      // Критичне збереження для нових карток
      const saved = this.saveDataImmediately(data);
      if (!saved) {
        throw new Error("Помилка збереження картки в сховищі");
      }

      return newCard;
    } catch (error) {
      console.error("Помилка створення картки:", error);
      throw error;
    }
  }

  // ВИПРАВЛЕНИЙ МЕТОД: Покращений алгоритм SM-2
  static updateSpacedRepetition(card, quality) {
    const sr = card.spacedRepetition;

    // Якість відповіді: 0-5 (як в Anki)
    quality = Math.max(0, Math.min(5, quality));

    // Стандартний алгоритм SM-2
    if (quality >= 3) {
      // Правильна відповідь
      if (sr.repetition === 0) {
        sr.interval = 1;
      } else if (sr.repetition === 1) {
        sr.interval = 6;
      } else {
        sr.interval = Math.round(sr.interval * sr.easeFactor);
      }

      sr.repetition++;
      sr.consecutiveCorrect++;

      // Оновлення фактору легкості (EF)
      sr.easeFactor =
        sr.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      sr.easeFactor = Math.max(1.3, sr.easeFactor);
    } else {
      // Неправильна відповідь - почати спочатку
      sr.repetition = 0;
      sr.consecutiveCorrect = 0;
      sr.interval = 1;

      // Зменшити фактор легкості для складних слів
      sr.easeFactor = Math.max(1.3, sr.easeFactor - 0.2);
    }

    // Оновлення складності на основі якості
    sr.difficulty = Math.max(
      1.0,
      Math.min(5.0, sr.difficulty + (quality - 3) * 0.1)
    );

    // Розрахунок наступного повторення
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + sr.interval);
    sr.nextReview = nextReview.toISOString();
    sr.lastInterval = sr.interval;

    // Стабільність для аналітики
    sr.stability = sr.interval * sr.easeFactor;

    console.log(
      `SM-2: якість=${quality}, інтервал=${
        sr.interval
      }дн, EF=${sr.easeFactor.toFixed(2)}, складність=${sr.difficulty.toFixed(
        2
      )}`
    );
  }

  // НОВИЙ МЕТОД: Оновлення прогресу з якістю
  static updateCardProgressWithQuality(cardId, quality) {
    const data = this.loadData();
    const card = data.cards.find((c) => c.id === cardId);

    if (card) {
      const now = new Date();

      // Оновлення прогресу
      card.progress.totalAnswers++;
      if (quality >= 3) {
        card.progress.correctAnswers++;
        card.progress.level = Math.min(card.progress.level + 1, 5);
      } else {
        card.progress.level = Math.max(card.progress.level - 1, 0);
      }

      card.progress.successRate = Math.round(
        (card.progress.correctAnswers / card.progress.totalAnswers) * 100
      );
      card.progress.lastReviewed = now.toISOString();

      // Оновлення SM-2 з якістю відповіді
      this.updateSpacedRepetition(card, quality);

      // Оновлення загальної статистики
      data.statistics.totalStudied++;
      if (quality >= 3) {
        data.statistics.totalRemembered++;
      }
      data.statistics.totalReviews++;
      data.statistics.lastStudySession = now.toISOString();

      // Критичне збереження - негайно
      this.saveDataImmediately(data);
      return true;
    }
    return false;
  }

  // Оновлений метод для зворотної сумісності
  static updateCardProgress(cardId, remembered) {
    const quality = remembered ? 4 : 1;
    return this.updateCardProgressWithQuality(cardId, quality);
  }

  static getCardsForStudy(category = "all", mode = "normal") {
    const data = this.loadData();
    let cards = data.cards;

    if (category !== "all") {
      cards = cards.filter((card) => card.category === category);
    }

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
          return successRate < 0.5 || card.spacedRepetition.difficulty > 3.5;
        });
        break;
    }

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

  static updateCard(updatedCard) {
    try {
      if (updatedCard.audioUrl && !this.isValidUrl(updatedCard.audioUrl)) {
        throw new Error("Невірний URL для аудіо");
      }
      if (updatedCard.imageUrl && !this.isValidUrl(updatedCard.imageUrl)) {
        throw new Error("Невірний URL для зображення");
      }
      if (
        updatedCard.frontImageUrl &&
        !this.isValidUrl(updatedCard.frontImageUrl)
      ) {
        throw new Error("Невірний URL для фронтального зображення");
      }

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
          frontImageUrl: updatedCard.frontImageUrl || "",
          category: updatedCard.category,
          updatedAt: new Date().toISOString(),

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

        if (!data.categories.includes(updatedCard.category)) {
          data.categories.push(updatedCard.category);
          data.categories.sort();
        }

        if (oldCategory !== updatedCard.category) {
          const isCategoryUsed = data.cards.some(
            (card) =>
              card.category === oldCategory && card.id !== updatedCard.id
          );
          if (!isCategoryUsed && oldCategory !== "Загальні") {
            data.categories = data.categories.filter(
              (cat) => cat !== oldCategory
            );
          }
        }

        this.saveDataImmediately(data);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Помилка оновлення картки:", error);
      throw error;
    }
  }

  static deleteCard(cardId) {
    const data = this.loadData();
    const cardIndex = data.cards.findIndex((card) => card.id === cardId);

    if (cardIndex !== -1) {
      const category = data.cards[cardIndex].category;
      data.cards.splice(cardIndex, 1);

      const isCategoryUsed = data.cards.some(
        (card) => card.category === category
      );
      if (!isCategoryUsed && category !== "Загальні") {
        data.categories = data.categories.filter((cat) => cat !== category);
      }

      this.saveDataImmediately(data);
      return true;
    }
    return false;
  }

  static deleteCategory(categoryName) {
    const data = this.loadData();

    if (!data.categories.includes(categoryName)) {
      return { success: false, message: "Категорія не знайдена" };
    }

    const cardsInCategory = data.cards.filter(
      (card) => card.category === categoryName
    );
    if (cardsInCategory.length > 0) {
      return {
        success: false,
        message: `Неможливо видалити категорію. В ній є ${cardsInCategory.length} карток. Спочатку перемістіть або видаліть ці картки.`,
      };
    }

    data.categories = data.categories.filter((cat) => cat !== categoryName);

    if (this.saveDataImmediately(data)) {
      return { success: true, message: "Категорію успішно видалено" };
    } else {
      return { success: false, message: "Помилка при збереженні даних" };
    }
  }

  static moveCardsToCategory(fromCategory, toCategory) {
    const data = this.loadData();

    const cardsToMove = data.cards.filter(
      (card) => card.category === fromCategory
    );
    cardsToMove.forEach((card) => {
      card.category = toCategory;
      card.updatedAt = new Date().toISOString();
    });

    return this.saveDataImmediately(data);
  }

  static getCategories() {
    const data = this.loadData();
    return data.categories || [];
  }

  static getCardsByCategory(category) {
    const data = this.loadData();
    if (category === "all") return data.cards;
    return data.cards.filter((card) => card.category === category);
  }

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

    // Нова статистика для SM-2
    const averageDifficulty =
      cards.length > 0
        ? cards.reduce(
            (sum, card) => sum + card.spacedRepetition.difficulty,
            0
          ) / cards.length
        : 0;

    const averageInterval =
      cards.length > 0
        ? cards.reduce((sum, card) => sum + card.spacedRepetition.interval, 0) /
          cards.length
        : 0;

    return {
      totalCards,
      dueCards,
      successRate,
      totalStudied,
      totalRemembered: data.statistics.totalRemembered,
      totalReviews: data.statistics.totalReviews,
      lastStudySession: data.statistics.lastStudySession,
      averageDifficulty: averageDifficulty.toFixed(2),
      averageInterval: averageInterval.toFixed(1),
      algorithm: "SM-2",
    };
  }

  static getCategoryProgress() {
    const data = this.loadData();
    const progress = {};

    data.cards.forEach((card) => {
      if (!progress[card.category]) {
        progress[card.category] = {
          total: 0,
          learned: 0,
          averageDifficulty: 0,
        };
      }

      progress[card.category].total++;
      if (card.progress.totalAnswers > 0) {
        progress[card.category].learned++;
      }
      progress[card.category].averageDifficulty +=
        card.spacedRepetition.difficulty;
    });

    Object.keys(progress).forEach((category) => {
      const catData = progress[category];
      catData.percentage =
        catData.total > 0
          ? Math.round((catData.learned / catData.total) * 100)
          : 0;
      catData.averageDifficulty =
        catData.total > 0
          ? (catData.averageDifficulty / catData.total).toFixed(2)
          : "0";
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
        algorithm: "sm2",
        interval: 1,
        easeFactor: 2.5,
        repetition: 0,
        nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        lastInterval: 0,
        stability: 0,
        difficulty: 2.5,
        consecutiveCorrect: 0,
      };
    });

    data.statistics = {
      totalStudied: 0,
      totalRemembered: 0,
      totalReviews: 0,
      lastStudySession: null,
    };

    this.saveDataImmediately(data);
    return true;
  }

  static resetCardIntervals() {
    const data = this.loadData();
    const now = new Date();

    data.cards.forEach((card) => {
      card.spacedRepetition.nextReview = now.toISOString();
      card.spacedRepetition.interval = 1;
      card.spacedRepetition.repetition = 0;
      card.spacedRepetition.consecutiveCorrect = 0;
    });

    this.saveDataImmediately(data);
    return true;
  }

  static exportData() {
    const data = this.loadData();
    return JSON.stringify(data, null, 2);
  }

  static importData(jsonData) {
    try {
      const importedData = JSON.parse(jsonData);
      const currentData = this.loadData();

      if (importedData.cards) {
        importedData.cards.forEach((importedCard) => {
          const existingIndex = currentData.cards.findIndex(
            (card) => card.id === importedCard.id
          );

          if (existingIndex !== -1) {
            currentData.cards[existingIndex] = {
              ...currentData.cards[existingIndex],
              ...importedCard,
            };
          } else {
            currentData.cards.push(this.migrateCard(importedCard));
          }
        });
      }

      if (importedData.categories) {
        importedData.categories.forEach((category) => {
          if (!currentData.categories.includes(category)) {
            currentData.categories.push(category);
          }
        });
        currentData.categories.sort();
      }

      return this.saveDataImmediately(currentData);
    } catch (error) {
      console.error("Помилка імпорту даних:", error);
      return false;
    }
  }

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

  static getStorageRecommendations() {
    const stats = this.getRealStorageStats();
    const remainingCards = Math.floor(stats.remaining / 2000);

    let message = "";
    let type = "info";

    if (stats.isCritical) {
      message = `⚡️ УВАГА! Сховище заповнено на ${stats.usagePercentage}%. Можна додати лише ${remainingCards} карток. Рекомендуємо експортувати та очистити дані.`;
      type = "error";
    } else if (stats.isNearLimit) {
      message = `⚠️ Сховище заповнено на ${stats.usagePercentage}%. Залишилось місця для ~${remainingCards} карток.`;
      type = "warning";
    } else {
      message = `✅ Сховище використано на ${stats.usagePercentage}%. Можна додати ще ~${remainingCards} карток.`;
      type = "success";
    }

    return {
      message: message,
      type: type,
      remainingCards: remainingCards,
    };
  }

  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Асинхронна ініціалізація
DataManager.initialize().then(() => {
  console.log("DataManager ініціалізовано");
});
