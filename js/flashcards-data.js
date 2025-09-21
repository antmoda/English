// База даних карток
let wordCards = {
  cards: [],
  categories: [],
  statistics: {
    totalStudied: 0,
    totalRemembered: 0,
    totalReviews: 0,
    lastStudySession: null,
  },
};

// Функції для роботи з даними
const DataManager = {
  // Завантажити дані з JSON файлу
  async loadData() {
    try {
      const response = await fetch("../json/flashcards-data.json");
      if (response.ok) {
        const jsonData = await response.json();
        wordCards.cards = jsonData.cards || [];
        wordCards.categories = jsonData.categories || [
          "Загальна",
          "Емоції",
          "Робота",
          "Подорожі",
        ];
        wordCards.statistics = jsonData.statistics || {
          totalStudied: 0,
          totalRemembered: 0,
          totalReviews: 0,
          lastStudySession: null,
        };

        this.initializeSpacedRepetitionSystem();
      } else {
        this.initializeDefaultData();
        await this.saveData(false);
      }
      return wordCards;
    } catch (error) {
      console.error("Помилка завантаження даних:", error);
      this.initializeDefaultData();
      await this.saveData(false);
      return wordCards;
    }
  },

  // Ініціалізувати систему інтервальних повторень
  initializeSpacedRepetitionSystem() {
    const now = new Date();
    wordCards.cards.forEach((card) => {
      if (!card.spacedRepetition) {
        card.spacedRepetition = {
          interval: 1,
          easeFactor: 2.5,
          repetition: 0,
          nextReview: new Date(
            now.getTime() + 24 * 60 * 60 * 1000
          ).toISOString(),
          lastInterval: 0,
          stability: 0,
        };
      }
    });
  },

  // Ініціалізувати дані за замовчуванням
  initializeDefaultData() {
    wordCards = {
      cards: [],
      categories: ["Загальна", "Емоції", "Робота", "Подорожі"],
      statistics: {
        totalStudied: 0,
        totalRemembered: 0,
        totalReviews: 0,
        lastStudySession: null,
      },
    };
  },

  // Зберегти дані у JSON файл
  async saveData(showDownload = true) {
    try {
      const dataStr = JSON.stringify(wordCards, null, 2);

      if (showDownload) {
        const blob = new Blob([dataStr], { type: "application/json" });

        const a = document.createElement("a");
        a.download = "word-cards-data.json";
        a.href = URL.createObjectURL(blob);
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(a.href);
        }, 100);
      }

      return true;
    } catch (error) {
      console.error("Помилка збереження даних:", error);
      return false;
    }
  },

  // Додати нову картку
  async addCard(cardData) {
    const now = new Date();
    const newCard = {
      id: Date.now().toString(),
      word: cardData.word.trim(),
      transcription: cardData.transcription.trim(),
      translation: cardData.translation.trim(),
      examples: [cardData.example1.trim(), cardData.example2.trim()],
      imageUrl: cardData.imageUrl || null,
      audioUrl: cardData.audioUrl || null,
      category: cardData.category || "Загальна",
      createdAt: now.toISOString(),
      tags: cardData.tags || [],
      stats: {
        studied: 0,
        remembered: 0,
        forgotten: 0,
        lastStudied: null,
        successRate: 0,
      },
      spacedRepetition: {
        interval: 1,
        easeFactor: 2.5,
        repetition: 0,
        nextReview: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        lastInterval: 0,
        stability: 0,
      },
    };

    wordCards.cards.push(newCard);

    // Додати категорію, якщо її ще немає
    this.addCategoryIfNew(newCard.category);

    const saved = await this.saveData(false);
    return saved ? newCard : null;
  },

  // Додати категорію, якщо її ще немає
  addCategoryIfNew(category) {
    if (category && !wordCards.categories.includes(category)) {
      wordCards.categories.push(category);
      wordCards.categories.sort();
    }
  },

  // Оновити картку
  async updateCard(cardId, cardData) {
    const cardIndex = wordCards.cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return false;

    const card = wordCards.cards[cardIndex];
    const oldCategory = card.category;
    const newCategory = cardData.category || "Загальна";

    // Оновити дані картки
    card.word = cardData.word.trim();
    card.transcription = cardData.transcription.trim();
    card.translation = cardData.translation.trim();
    card.examples = [cardData.example1.trim(), cardData.example2.trim()];
    card.imageUrl = cardData.imageUrl || null;
    card.audioUrl = cardData.audioUrl || null;
    card.category = newCategory;

    // Обробити зміну категорії
    if (oldCategory !== newCategory) {
      this.addCategoryIfNew(newCategory);

      // Перевірити чи стара категорія ще використовується
      const isOldCategoryUsed = wordCards.cards.some(
        (c) => c.category === oldCategory && c.id !== cardId
      );

      if (!isOldCategoryUsed && oldCategory !== "Загальна") {
        wordCards.categories = wordCards.categories.filter(
          (cat) => cat !== oldCategory
        );
      }
    }

    return await this.saveData(false);
  },

  // Видалити картку
  async deleteCard(cardId) {
    const cardIndex = wordCards.cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return false;

    const card = wordCards.cards[cardIndex];
    const category = card.category;

    wordCards.cards.splice(cardIndex, 1);

    // Перевірити чи категорія ще використовується
    const isCategoryUsed = wordCards.cards.some((c) => c.category === category);
    if (!isCategoryUsed && category !== "Загальна") {
      wordCards.categories = wordCards.categories.filter(
        (cat) => cat !== category
      );
    }

    return await this.saveData(false);
  },

  // Отримати картку за ID
  getCardById(cardId) {
    return wordCards.cards.find((c) => c.id === cardId);
  },

  // Оновити статистику картки
  async updateCardStats(cardId, remembered) {
    const card = this.getCardById(cardId);
    if (!card) return false;

    const now = new Date();

    // Оновити базову статистику
    card.stats.studied++;
    if (remembered) {
      card.stats.remembered++;
    } else {
      card.stats.forgotten++;
    }
    card.stats.lastStudied = now.toISOString();
    card.stats.successRate = Math.round(
      (card.stats.remembered / card.stats.studied) * 100
    );

    // Оновити загальну статистику
    wordCards.statistics.totalStudied++;
    if (remembered) {
      wordCards.statistics.totalRemembered++;
    }
    wordCards.statistics.totalReviews++;
    wordCards.statistics.lastStudySession = now.toISOString();

    // Оновити систему інтервальних повторень
    this.updateSpacedRepetition(card, remembered);

    await this.saveData(false);
    return true;
  },

  // Оновити систему інтервальних повторень
  updateSpacedRepetition(card, remembered) {
    const sr = card.spacedRepetition;

    if (remembered) {
      // Відповідь "Знаю"
      if (sr.repetition === 0) {
        sr.interval = 1;
      } else if (sr.repetition === 1) {
        sr.interval = 6;
      } else {
        sr.interval = Math.round(sr.interval * sr.easeFactor);
      }

      sr.repetition++;
      sr.easeFactor = Math.max(1.3, sr.easeFactor + 0.1);
    } else {
      // Відповідь "Не пам'ятаю"
      sr.repetition = Math.max(0, sr.repetition - 1);
      sr.interval = Math.max(1, Math.round(sr.interval * 0.5));
      sr.easeFactor = Math.max(1.3, sr.easeFactor - 0.2);
    }

    // Розрахувати наступну дату повторення
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + sr.interval);
    sr.nextReview = nextDate.toISOString();
  },

  // Отримати картки для повторення
  getCardsForReview() {
    const now = new Date();
    return wordCards.cards.filter((card) => {
      return new Date(card.spacedRepetition.nextReview) <= now;
    });
  },

  // Отримати складні картки
  getDifficultCards(limit = 20) {
    return wordCards.cards
      .filter((card) => card.stats.studied > 0)
      .sort((a, b) => a.stats.successRate - b.stats.successRate)
      .slice(0, limit);
  },

  // Отримати картки, які скоро потрібно буде повторювати
  getUpcomingReviews() {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return wordCards.cards
      .filter((card) => {
        const reviewDate = new Date(card.spacedRepetition.nextReview);
        return reviewDate > now && reviewDate <= nextWeek;
      })
      .sort(
        (a, b) =>
          new Date(a.spacedRepetition.nextReview) -
          new Date(b.spacedRepetition.nextReview)
      );
  },

  // Отримати статистику
  getStatistics() {
    const totalCards = wordCards.cards.length;
    const dueCards = this.getCardsForReview().length;
    const successRate =
      wordCards.statistics.totalStudied > 0
        ? Math.round(
            (wordCards.statistics.totalRemembered /
              wordCards.statistics.totalStudied) *
              100
          )
        : 0;

    return {
      totalCards,
      dueCards,
      successRate,
      totalStudied: wordCards.statistics.totalStudied,
      totalRemembered: wordCards.statistics.totalRemembered,
      lastStudySession: wordCards.statistics.lastStudySession,
    };
  },

  // Отримати прогрес по категоріях
  getCategoryProgress() {
    const progress = {};
    wordCards.categories.forEach((category) => {
      const cards = this.getCardsByCategory(category);
      const studied = cards.filter((card) => card.stats.studied > 0).length;
      progress[category] = {
        total: cards.length,
        studied: studied,
        percentage:
          cards.length > 0 ? Math.round((studied / cards.length) * 100) : 0,
      };
    });
    return progress;
  },

  // Отримати всі картки
  getAllCards() {
    return wordCards.cards;
  },

  // Отримати картки за категорією
  getCardsByCategory(category) {
    if (category === "all") return wordCards.cards;
    return wordCards.cards.filter((card) => card.category === category);
  },

  // Отримати всі категорії
  getCategories() {
    return wordCards.categories;
  },

  // Експорт даних
  exportData() {
    const data = {
      cards: wordCards.cards,
      categories: wordCards.categories,
      statistics: wordCards.statistics,
      exportedAt: new Date().toISOString(),
      version: "2.2",
    };
    return JSON.stringify(data, null, 2);
  },

  // Імпорт даних
  async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      if (data.cards && Array.isArray(data.cards)) {
        wordCards.cards = data.cards;
        wordCards.categories = data.categories || [
          "Загальна",
          "Емоції",
          "Робота",
          "Подорожі",
        ];
        wordCards.statistics = data.statistics || {
          totalStudied: 0,
          totalRemembered: 0,
          totalReviews: 0,
          lastStudySession: null,
        };

        this.initializeSpacedRepetitionSystem();
        await this.saveData(true);
        return true;
      }
      throw new Error("Невірний формат даних");
    } catch (e) {
      console.error("Помилка імпорту даних:", e);
      return false;
    }
  },
};

// Ініціалізація даних при завантаженні
document.addEventListener("DOMContentLoaded", async () => {
  await DataManager.loadData();
});

// Функції для керування даними
function resetAllProgress() {
  if (
    confirm("Ви впевнені, що хочете скинути весь прогрес? Ця дія незворотня.")
  ) {
    wordCards.cards.forEach((card) => {
      card.stats = {
        studied: 0,
        remembered: 0,
        forgotten: 0,
        lastStudied: null,
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

    wordCards.statistics = {
      totalStudied: 0,
      totalRemembered: 0,
      totalReviews: 0,
      lastStudySession: null,
    };

    DataManager.saveData(false);
    alert("Прогрес скинуто!");
    location.reload();
  }
}

function resetCardIntervals() {
  if (confirm("Скинути інтервали повторень для всіх карток?")) {
    const now = new Date();
    wordCards.cards.forEach((card) => {
      card.spacedRepetition.interval = 1;
      card.spacedRepetition.nextReview = new Date(
        now.getTime() + 24 * 60 * 60 * 1000
      ).toISOString();
    });

    DataManager.saveData(false);
    alert("Інтервали скинуто! Всі картки потребують повторення.");
    location.reload();
  }
}
