// Глобальний TTS менеджер
class TTSManager {
  constructor() {
    this.playCounts = new Map();
    this.maxPlays = 2;
    this.isSpeaking = false;
    this.browserSupport = this.checkBrowserSupport();
  }

  checkBrowserSupport() {
    return "speechSynthesis" in window;
  }

  async speak(text, lang = "en-US") {
    if (!this.browserSupport || this.isSpeaking) {
      return { success: false, error: "TTS не підтримується або зайнятий" };
    }

    return new Promise((resolve) => {
      this.isSpeaking = true;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => {
        this.isSpeaking = false;
        resolve({ success: true });
      };

      utterance.onerror = (error) => {
        console.error("TTS Error:", error);
        this.isSpeaking = false;
        resolve({ success: false, error: error.error });
      };

      try {
        speechSynthesis.speak(utterance);
      } catch (error) {
        this.isSpeaking = false;
        resolve({ success: false, error: error.message });
      }
    });
  }

  playExternalAudio(audioUrl) {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audio.onerror = () => {
      console.error("Помилка завантаження аудіо");
    };
    audio.play().catch((error) => {
      console.error("Помилка відтворення аудіо:", error);
    });
  }

  async playWithLimit(elementId, text, lang = "en-US") {
    const remainingPlays = this.getRemainingPlays(elementId);

    if (remainingPlays <= 0) {
      return { success: false, message: "Спроби вичерпано", type: "limit" };
    }

    const result = await this.speak(text, lang);

    if (result.success) {
      const newCount = (this.playCounts.get(elementId) || 0) + 1;
      this.playCounts.set(elementId, newCount);

      return {
        success: true,
        remaining: this.maxPlays - newCount,
        message: `Залишилось спроб: ${this.maxPlays - newCount}`,
      };
    }

    return {
      success: false,
      message: "Помилка відтворення: " + (result.error || "Невідома помилка"),
      type: "error",
    };
  }

  getRemainingPlays(elementId) {
    return this.maxPlays - (this.playCounts.get(elementId) || 0);
  }

  resetCounter(elementId) {
    this.playCounts.delete(elementId);
  }

  resetAllCounters() {
    this.playCounts.clear();
  }

  updateButtonState(buttonId, elementId, card = null) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    if (
      card &&
      card.audioConfig &&
      card.audioConfig.source === "external" &&
      card.audioConfig.url &&
      buttonId === "play-word-audio"
    ) {
      button.disabled = false;
      button.innerHTML = "🔊";
      button.title = "Ця картка використовує зовнішнє аудіо";
      button.onclick = () => this.playExternalAudio(card.audioConfig.url);
      return;
    }

    if (card && !this.canCardUseTTS(card)) {
      button.disabled = true;
      button.innerHTML = "🔇";
      button.title = "Аудіо недоступне";
      button.onclick = null;
      return;
    }

    if (!this.browserSupport) {
      button.disabled = true;
      button.innerHTML = "❌";
      button.title = "TTS не підтримується в цьому браузері";
      button.onclick = null;
      return;
    }

    const remaining = this.getRemainingPlays(elementId);

    if (remaining <= 0) {
      button.disabled = true;
      button.innerHTML = "⏹️";
      button.title = "Спроби вичерпано";
      button.onclick = null;
    } else {
      button.disabled = false;
      button.innerHTML = "▶️";
      button.title = `Прослухати (залишилось спроб: ${remaining})`;
      button.onclick = null;
    }
  }

  canCardUseTTS(card) {
    return card.audioConfig && card.audioConfig.ttsEnabled;
  }

  getCardAudioSource(card) {
    if (!card.audioConfig) return "none";

    if (card.audioConfig.ttsEnabled && this.browserSupport) {
      return "tts";
    }

    if (card.audioConfig.source === "external" && card.audioConfig.url) {
      return "external";
    }

    return "none";
  }
}

window.ttsManager = new TTSManager();

// Клас для управління модальними вікнами повідомлень
class ModalManager {
  constructor() {
    this.alertModal = document.getElementById("alert-modal");
    this.confirmModal = document.getElementById("confirm-modal");
    this.setupModals();
  }

  setupModals() {
    // Alert modal
    document
      .getElementById("close-alert-modal")
      .addEventListener("click", () => {
        this.hideAlert();
      });

    document
      .getElementById("alert-confirm-btn")
      .addEventListener("click", () => {
        this.hideAlert();
      });

    // Confirm modal
    document
      .getElementById("close-confirm-modal")
      .addEventListener("click", () => {
        this.hideConfirm(false);
      });

    document
      .getElementById("confirm-cancel-btn")
      .addEventListener("click", () => {
        this.hideConfirm(false);
      });

    document.getElementById("confirm-ok-btn").addEventListener("click", () => {
      this.hideConfirm(true);
    });

    // Закриття по кліку на фон
    this.alertModal.addEventListener("click", (e) => {
      if (e.target === this.alertModal) this.hideAlert();
    });

    this.confirmModal.addEventListener("click", (e) => {
      if (e.target === this.confirmModal) this.hideConfirm(false);
    });

    // Закриття по Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!this.alertModal.classList.contains("hidden")) this.hideAlert();
        if (!this.confirmModal.classList.contains("hidden"))
          this.hideConfirm(false);
      }
    });
  }

  showAlert(message, title = "Повідомлення", type = "info") {
    return new Promise((resolve) => {
      document.getElementById("alert-title").textContent = title;
      document.getElementById("alert-message").textContent = message;

      // Додаємо клас для типу повідомлення
      this.alertModal.className = "modal";
      this.alertModal.classList.add(`alert-${type}`);

      this.alertModal.classList.remove("hidden");
      document.body.style.overflow = "hidden";

      this.alertResolve = resolve;
    });
  }

  hideAlert() {
    this.alertModal.classList.add("hidden");
    document.body.style.overflow = "auto";
    if (this.alertResolve) {
      this.alertResolve();
      this.alertResolve = null;
    }
  }

  showConfirm(message, title = "Підтвердження") {
    return new Promise((resolve) => {
      document.getElementById("confirm-title").textContent = title;
      document.getElementById("confirm-message").textContent = message;

      this.confirmModal.classList.remove("hidden");
      document.body.style.overflow = "hidden";

      this.confirmResolve = resolve;
    });
  }

  hideConfirm(result) {
    this.confirmModal.classList.add("hidden");
    document.body.style.overflow = "auto";
    if (this.confirmResolve) {
      this.confirmResolve(result);
      this.confirmResolve = null;
    }
  }
}

// Глобальний об'єкт для модальних вікон
let modalManager = null;

// Функції для заміни стандартних alert/confirm
function showAlert(message, title = "Повідомлення", type = "info") {
  if (!modalManager) {
    console.error("ModalManager не ініціалізовано");
    // Fallback до стандартного alert
    alert(`${title}: ${message}`);
    return Promise.resolve();
  }
  return modalManager.showAlert(message, title, type);
}

function showConfirm(message, title = "Підтвердження") {
  if (!modalManager) {
    console.error("ModalManager не ініціалізовано");
    // Fallback до стандартного confirm
    const result = confirm(`${title}: ${message}`);
    return Promise.resolve(result);
  }
  return modalManager.showConfirm(message, title);
}

// Головний клас додатка
class WordLearningApp {
  constructor() {
    this.currentCardIndex = 0;
    this.currentCards = [];
    this.currentCategory = "all";
    this.isStudying = false;
    this.studyMode = "normal";

    this.initializeElements();
    this.bindEvents();
    this.loadCategories();
    this.showSection("study");
    this.setupTTS();
    this.setupTabs();
  }

  updateStorageStats(storageStats, recommendations) {
    if (document.getElementById("storage-usage-percent")) {
      document.getElementById(
        "storage-usage-percent"
      ).textContent = `${storageStats.usagePercentage}%`;
    }

    if (document.getElementById("storage-used")) {
      document.getElementById(
        "storage-used"
      ).textContent = `${storageStats.currentSizeMB} MB використано`;
    }

    if (document.getElementById("storage-total")) {
      document.getElementById(
        "storage-total"
      ).textContent = `Ліміт: ${storageStats.limitMB} MB`;
    }

    if (document.getElementById("storage-remaining")) {
      document.getElementById(
        "storage-remaining"
      ).textContent = `Залишилось: ${storageStats.remainingMB} MB`;
    }

    if (document.getElementById("storage-cards-count")) {
      document.getElementById("storage-cards-count").textContent =
        storageStats.cardsCount;
    }

    if (document.getElementById("storage-categories-count")) {
      document.getElementById("storage-categories-count").textContent =
        storageStats.categoriesCount;
    }

    const recommendationElement = document.getElementById(
      "storage-recommendation"
    );
    if (recommendationElement) {
      recommendationElement.textContent = recommendations.message;
      recommendationElement.className = "storage-recommendation";

      if (recommendations.type === "warning") {
        recommendationElement.classList.add("warning");
      } else if (recommendations.type === "error") {
        recommendationElement.classList.add("critical");
      } else {
        recommendationElement.classList.add("success");
      }
    }

    const usageCard = document.querySelector(
      "#storage-stats-container .stat-card:first-child"
    );
    if (usageCard) {
      usageCard.classList.remove("stat-card-warning", "stat-card-error");

      if (storageStats.isCritical) {
        usageCard.classList.add("stat-card-error");
      } else if (storageStats.isNearLimit) {
        usageCard.classList.add("stat-card-warning");
      }
    }
  }

  setupTTS() {
    if (!ttsManager.browserSupport) {
      this.disableTTSButtons();
    }
  }

  //   disableTTSButtons() {
  //     const ttsButtons = document.querySelectorAll(
  //       ".tts-preview-btn, .play-example-btn"
  //     );
  //     ttsButtons.forEach((btn) => {
  //       btn.disabled = true;
  //       btn.title = "TTS не підтримується";
  //       btn.innerHTML = "❌";
  //     });
  //   }

  setupTabs() {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tabName = btn.getAttribute("data-tab");

        tabBtns.forEach((b) => b.classList.remove("active"));
        tabContents.forEach((content) => content.classList.remove("active"));

        btn.classList.add("active");
        document.getElementById(`${tabName}-tab`).classList.add("active");
      });
    });
  }

  initializeElements() {
    // Навігація
    this.navButtons = {
      study: document.getElementById("btn-study"),
      create: document.getElementById("btn-create"),
      categories: document.getElementById("btn-categories"),
      stats: document.getElementById("btn-stats"),
    };

    // Секції
    this.sections = {
      study: document.getElementById("study-section"),
      create: document.getElementById("create-section"),
      categories: document.getElementById("categories-section"),
      stats: document.getElementById("stats-section"),
    };

    // Елементи вивчення
    this.categorySelect = document.getElementById("category-select");
    this.startStudyBtn = document.getElementById("start-study");
    this.startReviewBtn = document.getElementById("start-review");
    this.startDifficultBtn = document.getElementById("start-difficult");
    this.flashcardContainer = document.getElementById("flashcard-container");
    this.cardWord = document.getElementById("card-word");
    this.cardTranscription = document.getElementById("card-transcription-text");
    this.cardTranslation = document.getElementById("card-translation");
    this.cardExample1 = document.getElementById("card-example1");
    this.cardExample2 = document.getElementById("card-example2");
    this.currentPosition = document.getElementById("current-position");
    this.totalCards = document.getElementById("total-cards");

    // TTS елементи
    this.playWordAudioBtn = document.getElementById("play-word-audio");
    this.previewWordTtsBtn = document.getElementById("preview-word-tts");
    this.previewExample1TtsBtn = document.getElementById(
      "preview-example1-tts"
    );
    this.previewExample2TtsBtn = document.getElementById(
      "preview-example2-tts"
    );
    this.editPreviewWordTtsBtn = document.getElementById(
      "edit-preview-word-tts"
    );
    this.editPreviewExample1TtsBtn = document.getElementById(
      "edit-preview-example1-tts"
    );
    this.editPreviewExample2TtsBtn = document.getElementById(
      "edit-preview-example2-tts"
    );

    // Кнопки управління
    this.btnPrev = document.getElementById("btn-prev");
    this.btnNext = document.getElementById("btn-next");
    this.btnEdit = document.getElementById("btn-edit");
    this.btnRestart = document.getElementById("btn-restart");

    // Кнопки якості SM-2
    this.qualityButtons = document.querySelectorAll(".btn-quality");

    // Форми
    this.createForm = document.getElementById("create-card-form");
    this.cardEnglish = document.getElementById("card-english");
    this.cardTranscriptionInput = document.getElementById(
      "card-transcription-input"
    );
    this.cardTranslationInput = document.getElementById(
      "card-translation-input"
    );
    this.cardExample1Input = document.getElementById("card-example1-input");
    this.cardExample2Input = document.getElementById("card-example2-input");
    this.cardAudioUrl = document.getElementById("card-audio-url");
    this.cardFrontImageUrl = document.getElementById("card-front-image-url");
    this.cardImageUrl = document.getElementById("card-image-url");
    this.cardCategorySelect = document.getElementById("card-category-select");
    this.cardCategoryNew = document.getElementById("card-category-new");

    // Модальне вікно редагування
    this.editModal = document.getElementById("edit-modal");
    this.editForm = document.getElementById("edit-card-form");
    this.closeEditModalBtn = document.getElementById("close-edit-modal");
    this.deleteCardBtn = document.getElementById("delete-card-btn");
    this.editCardId = document.getElementById("edit-card-id");
    this.editCardEnglish = document.getElementById("edit-card-english");
    this.editCardTranscription = document.getElementById(
      "edit-card-transcription"
    );
    this.editCardTranslation = document.getElementById("edit-card-translation");
    this.editCardExample1 = document.getElementById("edit-card-example1");
    this.editCardExample2 = document.getElementById("edit-card-example2");
    this.editCardAudioUrl = document.getElementById("edit-card-audio-url");
    this.editCardFrontImageUrl = document.getElementById(
      "edit-card-front-image-url"
    );
    this.editCardImageUrl = document.getElementById("edit-card-image-url");
    this.editCardCategory = document.getElementById("edit-card-category");

    this.setupEditModal();
  }

  setupEditModal() {
    if (!this.editModal || !this.closeEditModalBtn) return;

    this.closeEditModalBtn.addEventListener("click", () => {
      this.hideEditModal();
    });

    this.editModal.addEventListener("click", (e) => {
      if (e.target === this.editModal) {
        this.hideEditModal();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !this.editModal.classList.contains("hidden")) {
        this.hideEditModal();
      }
    });

    if (this.editForm) {
      this.editForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleEditCard();
      });
    }

    if (this.deleteCardBtn) {
      this.deleteCardBtn.addEventListener("click", () => {
        this.deleteCurrentCard();
      });
    }
  }

  showEditModal() {
    if (this.editModal) {
      this.editModal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
  }

  hideEditModal() {
    if (this.editModal) {
      this.editModal.classList.add("hidden");
      document.body.style.overflow = "auto";
    }
  }

  bindEvents() {
    // Навігація
    Object.entries(this.navButtons).forEach(([key, btn]) => {
      if (btn) btn.addEventListener("click", () => this.showSection(key));
    });

    // Вивчення
    if (this.startStudyBtn)
      this.startStudyBtn.addEventListener("click", () => this.startStudy());
    if (this.startReviewBtn)
      this.startReviewBtn.addEventListener("click", () => this.startReview());
    if (this.startDifficultBtn)
      this.startDifficultBtn.addEventListener("click", () =>
        this.startDifficult()
      );

    // Кнопки управління картками
    if (this.btnPrev)
      this.btnPrev.addEventListener("click", () => this.showPreviousCard());
    if (this.btnNext)
      this.btnNext.addEventListener("click", () => this.showNextCard());
    if (this.btnEdit)
      this.btnEdit.addEventListener("click", () => this.editCurrentCard());
    if (this.btnRestart)
      this.btnRestart.addEventListener("click", () => this.restartStudy());

    // Кнопки якості SM-2
    if (this.qualityButtons) {
      this.qualityButtons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const quality = parseInt(e.target.getAttribute("data-quality"));
          this.markWithQuality(quality);
        });
      });
    }

    // Перевертання картки
    document.querySelectorAll(".btn-flip").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const flashcard = document.querySelector(".flashcard");
        if (flashcard) flashcard.classList.toggle("flipped");
      });
    });

    // Створення картки
    if (this.createForm) {
      this.createForm.addEventListener("submit", (e) =>
        this.handleCreateCard(e)
      );
    }

    // Зміна категорії
    if (this.categorySelect) {
      this.categorySelect.addEventListener("change", (e) => {
        this.currentCategory = e.target.value;
        if (this.isStudying) {
          this.restartStudy();
        }
      });
    }

    // TTS події
    this.bindTTSEvents();

    // Обробка клавіш
    document.addEventListener("keydown", (e) => this.handleKeyPress(e));
  }

  bindTTSEvents() {
    if (this.playWordAudioBtn) {
      this.playWordAudioBtn.addEventListener("click", () => {
        const card = this.currentCards[this.currentCardIndex];

        if (
          card &&
          card.audioConfig &&
          card.audioConfig.source === "external" &&
          card.audioConfig.url
        ) {
          ttsManager.playExternalAudio(card.audioConfig.url);
        } else {
          this.playWordTTS();
        }
      });
    }

    document.querySelectorAll(".play-example-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const exampleNumber =
          e.target.getAttribute("data-example") ||
          e.target.closest(".play-example-btn").getAttribute("data-example");
        this.playExampleTTS(exampleNumber);
      });
    });

    if (this.previewWordTtsBtn) {
      this.previewWordTtsBtn.addEventListener("click", () =>
        this.previewWordTTS()
      );
    }
    if (this.previewExample1TtsBtn) {
      this.previewExample1TtsBtn.addEventListener("click", () =>
        this.previewExampleTTS("1")
      );
    }
    if (this.previewExample2TtsBtn) {
      this.previewExample2TtsBtn.addEventListener("click", () =>
        this.previewExampleTTS("2")
      );
    }

    if (this.editPreviewWordTtsBtn) {
      this.editPreviewWordTtsBtn.addEventListener("click", () =>
        this.editPreviewWordTTS()
      );
    }
    if (this.editPreviewExample1TtsBtn) {
      this.editPreviewExample1TtsBtn.addEventListener("click", () =>
        this.editPreviewExampleTTS("1")
      );
    }
    if (this.editPreviewExample2TtsBtn) {
      this.editPreviewExample2TtsBtn.addEventListener("click", () =>
        this.editPreviewExampleTTS("2")
      );
    }
  }

  handleKeyPress(e) {
    if (!this.isStudying) return;

    switch (e.key) {
      case "ArrowLeft":
        this.showPreviousCard();
        break;
      case "ArrowRight":
        this.showNextCard();
        break;
      case " ":
        e.preventDefault();
        document.querySelector(".flashcard").classList.toggle("flipped");
        break;
      case "0":
        this.markWithQuality(0);
        break;
      case "1":
        this.markWithQuality(1);
        break;
      case "2":
        this.markWithQuality(2);
        break;
      case "3":
        this.markWithQuality(3);
        break;
      case "4":
        this.markWithQuality(4);
        break;
      case "5":
        this.markWithQuality(5);
        break;
    }
  }

  // Додайте цей код в markWithQuality для відладки
  markWithQuality(quality) {
    const card = this.currentCards[this.currentCardIndex];
    if (card) {
      DataManager.updateCardProgressWithQuality(card.id, quality);
      this.showNextCard();
    }
  }

  showSection(sectionName) {
    Object.values(this.sections).forEach((section) => {
      if (section) section.classList.remove("active");
    });

    Object.values(this.navButtons).forEach((btn) => {
      if (btn) btn.classList.remove("active");
    });

    if (this.sections[sectionName]) {
      this.sections[sectionName].classList.add("active");
    }
    if (this.navButtons[sectionName]) {
      this.navButtons[sectionName].classList.add("active");
    }

    if (sectionName === "study" || sectionName === "create") {
      this.loadCategories();
    }

    if (sectionName !== "study" && this.isStudying) {
      this.stopStudy();
    }

    if (sectionName === "stats") {
      this.updateStatistics();
    }

    if (sectionName === "categories") {
      this.updateCategoriesList();
    }
  }

  updateStatistics() {
    const stats = DataManager.getStatistics();
    const storageStats = DataManager.getRealStorageStats();
    const recommendations = DataManager.getStorageRecommendations();

    const progress = DataManager.getCategoryProgress();

    if (document.getElementById("stat-total-cards"))
      document.getElementById("stat-total-cards").textContent =
        stats.totalCards;
    if (document.getElementById("stat-due-cards"))
      document.getElementById("stat-due-cards").textContent = stats.dueCards;
    if (document.getElementById("stat-success-rate"))
      document.getElementById(
        "stat-success-rate"
      ).textContent = `${stats.successRate}%`;
    if (document.getElementById("stat-total-studied"))
      document.getElementById("stat-total-studied").textContent =
        stats.totalStudied;

    if (document.getElementById("stat-average-difficulty")) {
      document.getElementById("stat-average-difficulty").textContent =
        stats.averageDifficulty;
    }
    if (document.getElementById("stat-average-interval")) {
      document.getElementById(
        "stat-average-interval"
      ).textContent = `${stats.averageInterval} дн.`;
    }

    const progressContainer = document.getElementById("category-progress");
    if (progressContainer) {
      progressContainer.innerHTML = Object.entries(progress)
        .map(
          ([category, data]) => `
        <div class="category-progress-item">
          <span class="category-name">${category}</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${data.percentage}%"></div>
          </div>
          <span class="progress-text">${data.learned}/${data.total} (${data.percentage}%)</span>
          <small class="difficulty">Складність: ${data.averageDifficulty}</small>
        </div>
      `
        )
        .join("");
    }

    this.updateStorageStats(storageStats, recommendations);
  }

  loadCategories() {
    const categories = DataManager.getCategories();
    const options = ['<option value="all">Всі категорії</option>']
      .concat(categories.map((cat) => `<option value="${cat}">${cat}</option>`))
      .join("");

    [
      this.categorySelect,
      this.cardCategorySelect,
      this.editCardCategory,
    ].forEach((select) => {
      if (select) select.innerHTML = options;
    });
  }

  updateCategoriesList() {
    const categoriesList = document.getElementById("categories-list");
    const categories = DataManager.getCategories();
    const cards = DataManager.getAllCards();

    if (!categoriesList) return;

    if (categories.length === 0) {
      categoriesList.innerHTML =
        '<p class="no-data">Ще немає категорій. Створіть першу картку!</p>';
      return;
    }

    categoriesList.innerHTML = categories
      .map((category) => {
        const categoryCards = cards.filter(
          (card) => card.category === category
        );
        const learned = categoryCards.filter(
          (card) => card.progress.totalAnswers > 0
        ).length;
        const canDelete = categoryCards.length === 0 && category !== "Загальні";

        return `
            <div class="category-card">
                <h3>${category}</h3>
                <p>Карток: ${categoryCards.length}</p>
                <p>Вивчено: ${learned}</p>
                <div class="category-actions">
                    <button onclick="app.startCategoryStudy('${category}')" class="btn-primary">Вчити</button>
                    ${
                      canDelete
                        ? `<button onclick="app.deleteCategory('${category}')" class="btn-danger">Видалити</button>`
                        : ""
                    }
                </div>
            </div>
            `;
      })
      .join("");
  }

  async deleteCategory(categoryName) {
    if (categoryName === "Загальні") {
      await showAlert(
        "Категорію 'Загальні' не можна видалити",
        "Помилка",
        "error"
      );
      return;
    }

    const cardsInCategory = DataManager.getCardsByCategory(categoryName);

    if (cardsInCategory.length > 0) {
      const result = await showConfirm(
        `У категорії "${categoryName}" є ${cardsInCategory.length} карток. Перемістити їх до категорії "Загальні" перед видаленням?`,
        "Перемістити картки"
      );

      if (result) {
        const success = DataManager.moveCardsToCategory(
          categoryName,
          "Загальні"
        );
        if (success) {
          const result = DataManager.deleteCategory(categoryName);
          await showAlert(
            result.message,
            result.success ? "Успіх" : "Помилка",
            result.success ? "success" : "error"
          );
          this.updateCategoriesList();
          this.loadCategories();
        }
      }
    } else {
      const result = await showConfirm(
        `Ви впевнені, що хочете видалити категорію "${categoryName}"?`,
        "Видалити категорію"
      );

      if (result) {
        const result = DataManager.deleteCategory(categoryName);
        await showAlert(
          result.message,
          result.success ? "Успіх" : "Помилка",
          result.success ? "success" : "error"
        );
        this.updateCategoriesList();
        this.loadCategories();
      }
    }
  }

  startCategoryStudy(category) {
    // Встановлюємо поточну категорію
    this.currentCategory = category;

    // Оновлюємо випадаючий список на головній вкладці
    if (this.categorySelect) {
      this.categorySelect.value = category;

      // Додатково перевіряємо, чи категорія існує в списку
      const optionExists = Array.from(this.categorySelect.options).some(
        (option) => option.value === category
      );

      if (!optionExists && category !== "all") {
        // Якщо категорії немає в списку - додаємо її
        const newOption = new Option(category, category);
        this.categorySelect.add(newOption);
      }
    }

    // Показуємо секцію вивчення
    this.showSection("study");

    // Додатково: можна автоматично запустити вивчення
    setTimeout(() => {
      if (this.startStudyBtn) {
        this.startStudyBtn.click(); // Автоматичний запуск
      }
    }, 100);
  }

  async startStudy() {
    this.studyMode = "normal";
    await this.beginStudy();
  }

  async startReview() {
    this.studyMode = "review";
    await this.beginStudy();
  }

  async startDifficult() {
    this.studyMode = "difficult";
    await this.beginStudy();
  }

  async beginStudy() {
    const cards = DataManager.getCardsForStudy(
      this.currentCategory,
      this.studyMode
    );

    if (cards.length === 0) {
      await showAlert(
        "Немає карток для вивчення в цій категорії!",
        "Увага",
        "warning"
      );
      return;
    }

    this.currentCards = cards;
    this.currentCardIndex = 0;
    this.isStudying = true;

    this.flashcardContainer.classList.remove("hidden");
    this.showCurrentCard();
    this.updateProgress();
  }

  stopStudy() {
    this.isStudying = false;
    this.flashcardContainer.classList.add("hidden");
    this.currentCards = [];
    this.currentCardIndex = 0;
  }

  restartStudy() {
    if (this.isStudying) {
      this.stopStudy();
      this.beginStudy();
    }
  }

  showCurrentCard() {
    if (this.currentCards.length === 0) return;

    const card = this.currentCards[this.currentCardIndex];
    const flashcard = document.querySelector(".flashcard");
    if (flashcard) flashcard.classList.remove("flipped");

    this.cardWord.textContent = card.english;
    this.cardTranscription.textContent = card.transcription || "";
    this.cardTranslation.textContent = card.ukrainian;
    this.cardExample1.textContent = card.example1 || "";
    this.cardExample2.textContent = card.example2 || "";

    this.updateCardImage(card);
    this.updateFrontCardImage(card);

    ttsManager.resetCounter("current-word");
    ttsManager.resetCounter("current-example1");
    ttsManager.resetCounter("current-example2");

    ttsManager.updateButtonState("play-word-audio", "current-word", card);
    this.updateExampleButtonState("1");
    this.updateExampleButtonState("2");

    // this.updateAudioStatuses();
  }

  updateExampleButtonState(exampleNumber) {
    const elementId = `current-example${exampleNumber}`;
    const button = document.querySelector(`[data-example="${exampleNumber}"]`);
    const card = this.currentCards[this.currentCardIndex];

    if (!button) return;

    if (!ttsManager.browserSupport) {
      button.disabled = true;
      button.innerHTML = "❌";
      button.title = "TTS не підтримується в цьому браузері";
      return;
    }

    const remaining = ttsManager.getRemainingPlays(elementId);

    if (remaining <= 0) {
      button.disabled = true;
      button.innerHTML = "⏹️";
      button.title = "Спроби вичерпано";
    } else {
      button.disabled = false;
      button.innerHTML = "▶️";
      button.title = `Прослухати приклад (залишилось спроб: ${remaining})`;
    }
  }

  updateCardImage(card) {
    const existingContainer = document.getElementById("card-image-container");
    if (existingContainer) {
      existingContainer.remove();
    }

    if (card.imageUrl) {
      const imageContainer = document.createElement("div");
      imageContainer.id = "card-image-container";

      const img = document.createElement("img");
      img.src = card.imageUrl;
      img.alt = card.english;
      img.onerror = function () {
        this.style.display = "none";
      };

      imageContainer.appendChild(img);

      const backSide = document.querySelector(".flashcard-back");
      if (backSide) {
        const mainContent = backSide.querySelector(".flashcard-main-content");
        if (mainContent) {
          const translationElement = mainContent.querySelector("h2");
          if (translationElement) {
            mainContent.insertBefore(
              imageContainer,
              translationElement.nextSibling
            );
          }
        }
      }
    }
  }

  updateFrontCardImage(card) {
    const existingContainer = document.getElementById(
      "card-front-image-container"
    );
    if (existingContainer) existingContainer.remove();

    if (card.frontImageUrl) {
      const imageContainer = document.createElement("div");
      imageContainer.id = "card-front-image-container";

      const img = document.createElement("img");
      img.src = card.frontImageUrl;
      img.alt = card.english;
      img.onerror = function () {
        this.style.display = "none";
      };

      imageContainer.appendChild(img);

      const frontSide = document.querySelector(".flashcard-front");
      if (frontSide) {
        const mainContent = frontSide.querySelector(".flashcard-main-content");
        if (mainContent) {
          const transcriptionElement = mainContent.querySelector(
            "#card-transcription-text"
          );
          if (transcriptionElement) {
            mainContent.insertBefore(
              imageContainer,
              transcriptionElement.nextSibling
            );
          } else {
            const wordElement = mainContent.querySelector("h2");
            if (wordElement) {
              mainContent.insertBefore(imageContainer, wordElement.nextSibling);
            }
          }
        }
      }
    }
  }

  updateProgress() {
    this.currentPosition.textContent = this.currentCardIndex + 1;
    this.totalCards.textContent = this.currentCards.length;

    const progress =
      ((this.currentCardIndex + 1) / this.currentCards.length) * 100;
    document.querySelector(".progress-fill").style.width = `${progress}%`;
  }

  showNextCard() {
    if (this.currentCardIndex < this.currentCards.length - 1) {
      this.currentCardIndex++;
      this.showCurrentCard();
      this.updateProgress();
    } else {
      this.completeStudy();
    }
  }

  showPreviousCard() {
    if (this.currentCardIndex > 0) {
      this.currentCardIndex--;
      this.showCurrentCard();
      this.updateProgress();
    }
  }

  async completeStudy() {
    await showAlert(
      "Вивчення завершено! Всі картки пройдено.",
      "Завершено",
      "success"
    );
    this.stopStudy();
  }

  async editCurrentCard() {
    if (
      !this.isStudying ||
      this.currentCards.length === 0 ||
      this.currentCardIndex >= this.currentCards.length
    ) {
      await showAlert(
        "Спочатку почніть навчання, картки відсутні",
        "Помилка",
        "error"
      );
      return;
    }

    const card = this.currentCards[this.currentCardIndex];

    if (!card || !card.id) {
      await showAlert(
        "Картка не знайдена або не має ідентифікатора",
        "Помилка",
        "error"
      );
      return;
    }

    this.showEditModal(card);
  }

  showEditModal(card) {
    if (!card || !card.id) {
      showAlert("Картка не знайдена", "Помилка", "error");
      return;
    }

    this.editCardId.value = card.id;
    this.editCardEnglish.value = card.english || "";
    this.editCardTranscription.value = card.transcription || "";
    this.editCardTranslation.value = card.ukrainian || "";
    this.editCardExample1.value = card.example1 || "";
    this.editCardExample2.value = card.example2 || "";

    this.editCardAudioUrl.value = card.audioConfig?.url || "";
    this.editCardFrontImageUrl.value = card.frontImageUrl || "";
    this.editCardImageUrl.value = card.imageUrl || "";

    if (this.editCardCategory) {
      this.editCardCategory.value = card.category || "Загальні";
    }

    ttsManager.resetCounter("edit-word");
    ttsManager.resetCounter("edit-example1");
    ttsManager.resetCounter("edit-example2");

    ttsManager.updateButtonState("edit-preview-word-tts", "edit-word");
    ttsManager.updateButtonState("edit-preview-example1-tts", "edit-example1");
    ttsManager.updateButtonState("edit-preview-example2-tts", "edit-example2");

    this.editModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  async handleEditCard() {
    const cardData = {
      id: this.editCardId.value,
      english: this.editCardEnglish.value.trim(),
      transcription: this.editCardTranscription.value.trim(),
      ukrainian: this.editCardTranslation.value.trim(),
      example1: this.editCardExample1.value.trim(),
      example2: this.editCardExample2.value.trim(),
      audioUrl: this.editCardAudioUrl.value.trim(),
      frontImageUrl: this.editCardFrontImageUrl.value.trim(),
      imageUrl: this.editCardImageUrl.value.trim(),
      category: this.editCardCategory.value || "Загальні",
    };

    if (!cardData.id || !cardData.english || !cardData.ukrainian) {
      await showAlert(
        "Будь ласка, заповніть обов'язкові поля",
        "Помилка",
        "error"
      );
      return;
    }

    const success = DataManager.updateCard(cardData);

    if (success) {
      this.hideEditModal();

      if (this.isStudying) {
        this.restartStudy();
      }

      await showAlert("Картку успішно оновлено!", "Успіх", "success");
    } else {
      await showAlert("Помилка при оновленні картки!", "Помилка", "error");
    }
  }

  async deleteCurrentCard() {
    const result = await showConfirm(
      "Ви впевнені, що хочете видалити цю картку?",
      "Видалити картку"
    );

    if (!result) return;

    const cardId = this.editCardId.value;
    DataManager.deleteCard(cardId);
    this.hideEditModal();

    if (this.isStudying) {
      this.restartStudy();
    }

    await showAlert("Картку успішно видалено!", "Успіх", "success");
  }

  async handleCreateCard(e) {
    e.preventDefault();

    try {
      let category = this.cardCategorySelect.value;
      if (!category || category === "" || category === "all") {
        category = this.cardCategoryNew.value.trim();
      }

      if (!category) {
        category = "Загальні";
      }

      const cardData = {
        english: this.cardEnglish.value.trim(),
        transcription: this.cardTranscriptionInput.value.trim(),
        ukrainian: this.cardTranslationInput.value.trim(),
        example1: this.cardExample1Input.value.trim(),
        example2: this.cardExample2Input.value.trim(),
        audioUrl: this.cardAudioUrl.value.trim(),
        frontImageUrl: this.cardFrontImageUrl.value.trim(),
        imageUrl: this.cardImageUrl.value.trim(),
        category: category,
      };

      if (!cardData.english || !cardData.ukrainian) {
        await showAlert(
          "Будь ласка, заповніть обов'язкові поля",
          "Помилка",
          "error"
        );
        return;
      }

      DataManager.createCard(cardData);

      this.createForm.reset();

      document
        .querySelectorAll(".tab-btn")
        .forEach((btn) => btn.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((content) => content.classList.remove("active"));
      document.querySelector('[data-tab="front"]').classList.add("active");
      document.getElementById("front-tab").classList.add("active");

      ttsManager.resetCounter("create-word");
      ttsManager.resetCounter("create-example1");
      ttsManager.resetCounter("create-example2");

      this.updateTTSStatuses();

      await showAlert("Картку успішно створено!", "Успіх", "success");
      this.loadCategories();
    } catch (error) {
      await showAlert(
        `Помилка при створенні картки: ${error.message}`,
        "Помилка",
        "error"
      );
    }
  }

  // TTS методи
  async playWordTTS() {
    const card = this.currentCards[this.currentCardIndex];
    const result = await ttsManager.playWithLimit("current-word", card.english);
    this.updateAudioStatus("word-audio-status", result);
    ttsManager.updateButtonState("play-word-audio", "current-word", card);
  }

  async playExampleTTS(exampleNumber) {
    const card = this.currentCards[this.currentCardIndex];
    const exampleText = exampleNumber === "1" ? card.example1 : card.example2;

    if (!exampleText) return;

    const elementId = `current-example${exampleNumber}`;
    const result = await ttsManager.playWithLimit(elementId, exampleText);

    this.updateExampleButtonState(exampleNumber);
  }

  async previewWordTTS() {
    const word = this.cardEnglish.value.trim();
    if (!word) return;

    const result = await ttsManager.playWithLimit("create-word", word);
    this.updateAudioStatus("word-tts-status", result);
    ttsManager.updateButtonState("preview-word-tts", "create-word");
  }

  async previewExampleTTS(exampleNumber) {
    const input =
      exampleNumber === "1" ? this.cardExample1Input : this.cardExample2Input;
    const text = input.value.trim();
    if (!text) return;

    const elementId = `create-example${exampleNumber}`;
    const result = await ttsManager.playWithLimit(elementId, text);

    const statusElement = document
      .querySelector(`#card-example${exampleNumber}-input`)
      ?.closest(".form-group")
      ?.querySelector(".example-tts-status");
    if (statusElement) {
      this.updateAudioStatusElement(statusElement, result);
    }

    ttsManager.updateButtonState(
      `preview-example${exampleNumber}-tts`,
      elementId
    );
  }

  async editPreviewWordTTS() {
    const word = this.editCardEnglish.value.trim();
    if (!word) return;

    const result = await ttsManager.playWithLimit("edit-word", word);
    this.updateAudioStatus("edit-word-tts-status", result);
    ttsManager.updateButtonState("edit-preview-word-tts", "edit-word");
  }

  async editPreviewExampleTTS(exampleNumber) {
    const input =
      exampleNumber === "1" ? this.editCardExample1 : this.editCardExample2;
    const text = input.value.trim();
    if (!text) return;

    const elementId = `edit-example${exampleNumber}`;
    const result = await ttsManager.playWithLimit(elementId, text);

    ttsManager.updateButtonState(
      `edit-preview-example${exampleNumber}-tts`,
      elementId
    );
  }

  updateAudioStatus(statusElementId, result) {
    const element = document.getElementById(statusElementId);
    if (element) {
      this.updateAudioStatusElement(element, result);
    }
  }

  updateAudioStatusElement(element, result) {
    if (result.success) {
      element.textContent = result.message || "Успішно відтворено";
      element.style.color = "green";
    } else {
      element.textContent = result.message || "Помилка відтворення";
      element.style.color = result.type === "limit" ? "orange" : "red";
    }
  }

  updateTTSStatuses() {
    const statusElements = document.querySelectorAll(
      "#word-tts-status, .example-tts-status"
    );
    statusElements.forEach((element) => {
      element.textContent = "Готово до прослуховування (2 спроби)";
      element.style.color = "black";
    });
  }

  //   updateAudioStatuses() {
  //     const wordRemaining = ttsManager.getRemainingPlays("current-word");
  //     const example1Remaining = ttsManager.getRemainingPlays("current-example1");
  //     const example2Remaining = ttsManager.getRemainingPlays("current-example2");

  //     if (document.getElementById("word-audio-status")) {
  //       document.getElementById(
  //         "word-audio-status"
  //       ).textContent = `Готово (${wordRemaining} спроб)`;
  //     }

  //     document
  //       .querySelectorAll(".example-audio-status")
  //       .forEach((element, index) => {
  //         const remaining = index === 0 ? example1Remaining : example2Remaining;
  //         element.textContent = `(${remaining} спроб)`;
  //       });
  //   }
}

// Глобальні функції для експорту/імпорту
async function exportData() {
  try {
    const data = DataManager.exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flashcards-backup-${
      new Date().toISOString().split("T")[0]
    }.json`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Звільняємо пам'ять через час
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000); // 1 хвилина
  } catch (error) {
    console.error("Помилка експорту:", error);
    await showAlert(
      "Помилка підготовки даних для експорту",
      "Помилка",
      "error"
    );
  }
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const importedData = JSON.parse(e.target.result);

      const result = await showConfirm(
        "Ви впевнені, що хочете імпортувати дані? Поточні дані будуть об'єднані з імпортованими.",
        "Імпорт даних"
      );

      if (result) {
        if (DataManager.importData(JSON.stringify(importedData))) {
          await showAlert(
            "Дані успішно імпортовано!",
            "Імпорт завершено",
            "success"
          );
          location.reload();
        } else {
          await showAlert("Помилка імпорту даних.", "Помилка", "error");
        }
      }
    } catch (error) {
      await showAlert(
        "Помилка читання файлу: " + error.message,
        "Помилка",
        "error"
      );
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}

async function resetAllProgress() {
  const result = await showConfirm(
    "Ви впевнені, що хочете скинути весь прогрес? Ця дія незворотна.",
    "Скинути прогрес"
  );

  if (result) {
    DataManager.resetAllProgress();
    await showAlert(
      "Прогрес успішно скинуто!",
      "Скидання завершено",
      "success"
    );
    if (window.app) {
      window.app.updateStatistics();
    }
  }
}

async function resetCardIntervals() {
  const result = await showConfirm(
    "Скинути інтервали повторень для всіх карток?",
    "Скинути інтервали"
  );

  if (result) {
    DataManager.resetCardIntervals();
    await showAlert(
      "Інтервали повторень скинуто!",
      "Скидання завершено",
      "success"
    );
  }
}

// Ініціалізація додатка
document.addEventListener("DOMContentLoaded", async function () {
  // Спочатку ініціалізуємо DataManager
  await DataManager.initialize();

  // Потім створюємо додаток
  modalManager = new ModalManager();
  window.modalManager = modalManager;
  window.app = new WordLearningApp();

  // Додаємо ініціалізацію системи тестування
  window.app.setupTesting();
  window.app.updateTestingStatistics();
});

// Розширення класу WordLearningApp для підтримки тестування
WordLearningApp.prototype.setupTesting = function () {
  // Додаємо кнопку тестування в навігацію
  const testingBtn = document.createElement("button");
  testingBtn.id = "btn-testing";
  testingBtn.className = "nav-btn";
  testingBtn.textContent = "Тестування слів";
  testingBtn.addEventListener("click", () => this.showSection("testing"));

  // Додаємо кнопку після статистики
  this.navButtons.stats.parentNode.insertBefore(
    testingBtn,
    this.navButtons.stats.nextSibling
  );
  this.navButtons.testing = testingBtn;

  // Створюємо секцію тестування
  this.createTestingSection();
};

WordLearningApp.prototype.createTestingSection = function () {
  const testingSection = document.createElement("section");
  testingSection.id = "testing-section";
  testingSection.className = "section";
  testingSection.innerHTML = this.getTestingSectionHTML();

  this.sections.stats.parentNode.insertBefore(
    testingSection,
    this.sections.stats.nextSibling
  );
  this.sections.testing = testingSection;

  this.bindTestingEvents();
};

WordLearningApp.prototype.getTestingSectionHTML = function () {
  return `
        <h2>Тестування слів</h2>
        
        <!-- Налаштування тесту -->
        <div id="test-settings" class="test-settings">
            <h3>Налаштування тесту</h3>
            
            <div class="form-group">
                <label for="test-words-count">Кількість слів:</label>
                <select id="test-words-count">
                    <option value="5">5 слів</option>
                    <option value="10" selected>10 слів</option>
                    <option value="15">15 слів</option>
                    <option value="20">20 слів</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="test-category">Категорія:</label>
                <select id="test-category">
                    <option value="all">Всі категорії</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Типи завдань:</label>
                <div class="checkbox-group">
                    <label>
                        <input type="checkbox" id="include-audio" checked>
                        Аудіо-завдання
                    </label>
                    <label>
                        <input type="checkbox" id="include-text" checked>
                        Текстові завданя
                    </label>
                </div>
            </div>
            
            <div class="form-group">
                <label for="test-difficulty">Складність:</label>
                <select id="test-difficulty">
                    <option value="all">Всі слова</option>
                    <option value="new">Нові слова</option>
                    <option value="difficult">Складні слова</option>
                    <option value="review">Для повторення</option>
                </select>
            </div>
            
            <button id="start-test" class="btn-primary">Почати тестування</button>
            
            <div class="test-info">
                <small>Доступно карток: <span id="available-cards-count">0</span></small>
            </div>
        </div>
        
        <!-- Процес тестування -->
        <div id="test-process" class="test-process hidden">
            <div class="test-progress">
                <span id="test-current">1</span>/<span id="test-total">10</span>
                <div class="progress-bar">
                    <div class="progress-fill" id="test-progress-fill"></div>
                </div>
            </div>
            
            <div class="test-question">
                <div id="question-audio" class="question-audio hidden">
                    <button id="play-question-audio" class="btn-primary">▶️ Прослухати слово</button>
                    
                </div>
                
                <div id="question-text" class="question-text hidden">
                    <h3 id="question-word"></h3>
                    <p id="question-transcription"></p>
                </div>
                
                <div class="answer-form">
                    <div class="form-group">
                        <label for="user-transcription">Транскрипція (якщо потрібно):</label>
                        <input type="text" id="user-transcription" placeholder="/ˈwɜːd/">
                        <small>Введіть транскрипцію, якщо вона вказана в картці</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="user-translation">Переклад українською:</label>
                        <input type="text" id="user-translation" placeholder="слово" required>
                        <small>Обов'язкове поле</small>
                    </div>
                    
                    <button id="check-answer" class="btn-primary">Перевірити відповідь</button>
                </div>
            </div>
        </div>
        
        <!-- Результат питання -->
        <div id="question-result" class="question-result hidden">
            <div id="result-message"></div>
            <div id="correct-answer"></div>
            <div class="mastery-info">
                <small>Поточний рівень майстерності: <span id="current-mastery">I</span></small>
                <small>Стабільність: <span id="current-stability">0</span></small>
            </div>
            <button id="next-question" class="btn-primary">Далі →</button>
        </div>
        
        <!-- Результати тесту -->
        <div id="test-results" class="test-results hidden">
            <h3>Результати тесту</h3>
            <div id="results-stats"></div>
            <div class="results-actions">
                <button id="new-test" class="btn-primary">Нове тестування</button>
                <button id="review-mistakes" class="btn-secondary">Повторити помилки</button>
            </div>
        </div>
        
        <!-- Статистика тестування -->
        <div id="testing-statistics" class="testing-statistics">
            <h3>Статистика тестування</h3>
            <div id="testing-stats-container"></div>
            
            <div class="testing-actions">
                <button onclick="exportTestingData()" class="btn-secondary">📥 Експорт статистики</button>
                <label class="btn-secondary">
                    📤 Імпорт статистики
                    <input type="file" id="import-testing-file" accept=".json" style="display: none;"
                        onchange="importTestingData(event)">
                </label>
                <button onclick="resetTestingData()" class="btn-danger">Скинути статистику</button>
            </div>
        </div>
    `;
};

WordLearningApp.prototype.bindTestingEvents = function () {
  document
    .getElementById("start-test")
    ?.addEventListener("click", () => this.startTest());
  document
    .getElementById("check-answer")
    ?.addEventListener("click", () => this.checkAnswer());
  document
    .getElementById("next-question")
    ?.addEventListener("click", () => this.nextQuestion());
  document
    .getElementById("new-test")
    ?.addEventListener("click", () => this.showTestSettings());
  document
    .getElementById("play-question-audio")
    ?.addEventListener("click", () => this.playQuestionAudio());
  document
    .getElementById("review-mistakes")
    ?.addEventListener("click", () => this.reviewMistakes());

  // Оновлення категорій при показі секції тестування
  document.getElementById("btn-testing")?.addEventListener("click", () => {
    this.loadTestCategories();
    this.updateAvailableCardsCount();
    this.updateTestingStatistics();
  });
};

WordLearningApp.prototype.startTest = function () {
  const wordsCount = parseInt(
    document.getElementById("test-words-count").value
  );
  const includeAudio = document.getElementById("include-audio").checked;
  const includeText = document.getElementById("include-text").checked;
  const category = document.getElementById("test-category").value;
  const difficulty = document.getElementById("test-difficulty").value;

  // Оновлення налаштувань
  testingSystem.settings.wordsPerTest = wordsCount;
  testingSystem.settings.includeAudio = includeAudio;
  testingSystem.settings.includeText = includeText;
  testingSystem.settings.category = category;
  testingSystem.settings.difficulty = difficulty;

  // Генерація тесту з урахуванням категорії та складності
  const test = testingSystem.generateTest();

  if (!test || test.cards.length === 0) {
    showAlert(
      "Не вдалося знайти слова для тестування. Спробуйте змінити критерії або додайте більше карток.",
      "Увага",
      "warning"
    );
    return;
  }

  this.currentTest = test;
  this.showTestQuestion();
};

WordLearningApp.prototype.showTestQuestion = function () {
  // ВИПРАВЛЕННЯ: Використовуємо правильний індекс
  const currentIndex = this.currentTest.currentIndex;

  if (!this.currentTest || currentIndex >= this.currentTest.cards.length) {
    this.completeTest();
    return;
  }

  const currentCard = this.currentTest.cards[currentIndex];

  // Оновлення прогресу
  document.getElementById("test-current").textContent = currentIndex + 1;
  document.getElementById("test-total").textContent =
    this.currentTest.cards.length;
  this.updateTestProgress();

  // Визначення типу питання
  const useAudio =
    testingSystem.settings.includeAudio &&
    currentCard.audioConfig?.source !== "none";
  const useText = testingSystem.settings.includeText;

  // Випадковий вибір між аудіо та текстом, якщо обидва включені
  let showAudio = useAudio;
  let showText = useText;

  if (useAudio && useText) {
    showAudio = Math.random() > 0.5;
    showText = !showAudio;
  }

  document
    .getElementById("question-audio")
    .classList.toggle("hidden", !showAudio);
  document
    .getElementById("question-text")
    .classList.toggle("hidden", !showText);

  if (showText) {
    document.getElementById("question-word").textContent = currentCard.english;
    document.getElementById("question-transcription").textContent =
      currentCard.transcription || "";
  }

  // Очищення полів вводу
  document.getElementById("user-transcription").value = "";
  document.getElementById("user-translation").value = "";

  // Фокус на полі вводу
  document.getElementById("user-translation").focus();

  // Збереження поточного питання
  this.currentQuestionCard = currentCard;
  this.currentQuestionMastery = testingSystem.getCardMastery(currentCard.id);

  // СИНХРОНІЗАЦІЯ: Оновлюємо this.currentCardIndex
  this.currentCardIndex = currentIndex;

  // Показ процесу тестування
  document.getElementById("test-settings").classList.add("hidden");
  document.getElementById("test-process").classList.remove("hidden");
  document.getElementById("question-result").classList.add("hidden");
  document.getElementById("test-results").classList.add("hidden");
};
WordLearningApp.prototype.updateTestProgress = function () {
  const currentIndex = this.currentTest.currentIndex;
  const progress = ((currentIndex + 1) / this.currentTest.cards.length) * 100;
  document.getElementById("test-progress-fill").style.width = `${progress}%`;
};

WordLearningApp.prototype.playQuestionAudio = function () {
  if (this.currentQuestionCard) {
    if (
      this.currentQuestionCard.audioConfig?.source === "external" &&
      this.currentQuestionCard.audioConfig.url
    ) {
      ttsManager.playExternalAudio(this.currentQuestionCard.audioConfig.url);
    } else {
      ttsManager.speak(this.currentQuestionCard.english);
    }
  }
};

WordLearningApp.prototype.nextQuestion = function () {
  if (this.currentTest.currentIndex < this.currentTest.cards.length - 1) {
    this.currentTest.currentIndex++;
    this.showTestQuestion();
  } else {
    this.completeTest();
  }
};

WordLearningApp.prototype.bindTestingEvents = function () {
  document
    .getElementById("start-test")
    ?.addEventListener("click", () => this.startTest());
  document
    .getElementById("check-answer")
    ?.addEventListener("click", () => this.checkAnswer());
  document
    .getElementById("next-question")
    ?.addEventListener("click", () => this.nextQuestion());
  document
    .getElementById("new-test")
    ?.addEventListener("click", () => this.showTestSettings());
  document
    .getElementById("play-question-audio")
    ?.addEventListener("click", () => this.playQuestionAudio());
  document
    .getElementById("review-mistakes")
    ?.addEventListener("click", () => this.reviewMistakes());

  // Оновлення категорій при показі секції тестування
  document.getElementById("btn-testing")?.addEventListener("click", () => {
    this.loadTestCategories();
    this.updateAvailableCardsCount();
    this.updateTestingStatistics();
  });
};

WordLearningApp.prototype.showQuestionResult = function (result) {
  // ПЕРЕВІРКА 1: Чи є поточний тест і картка
  if (!this.currentTest || !this.currentTest.cards[this.currentCardIndex]) {
    console.error("Немає поточної картки для відображення результату");
    return;
  }

  const currentCard = this.currentTest.cards[this.currentCardIndex];

  // ПЕРЕВІРКА 2: Безпечне отримання даних майстерності
  let oldMastery, newMastery;
  try {
    oldMastery = this.currentQuestionMastery ||
      testingSystem.getCardMastery(currentCard.id) || {
        masteryLevel: 1,
        stability: 0,
      };
    newMastery = testingSystem.getCardMastery(currentCard.id) || {
      masteryLevel: 1,
      stability: 0,
    };
  } catch (error) {
    console.error("Помилка отримання даних майстерності:", error);
    oldMastery = { masteryLevel: 1, stability: 0 };
    newMastery = { masteryLevel: 1, stability: 0 };
  }

  // ПЕРЕВІРКА 3: Безпечне отримання елементів DOM
  const resultMessageElement = document.getElementById("result-message");
  const correctAnswerElement = document.getElementById("correct-answer");
  const currentMasteryElement = document.getElementById("current-mastery");
  const currentStabilityElement = document.getElementById("current-stability");

  if (!resultMessageElement || !correctAnswerElement) {
    console.error("Не знайдено елементи для відображення результату");
    return;
  }

  // Відображення основного результату
  let message = "";
  if (result && result.isCorrect) {
    message = '<div class="result-correct">✅ Правильно!</div>';
  } else {
    message = '<div class="result-incorrect">❌ Неправильно</div>';
  }

  // Відображення правильної відповіді
  let correctAnswer = `
        <div class="correct-answer">
            <strong>Правильна відповідь:</strong><br>
            Слово: <strong>${currentCard.english || "Невідомо"}</strong><br>
            ${
              currentCard.transcription
                ? `Транскрипція: <strong>${currentCard.transcription}</strong><br>`
                : ""
            }
            Переклад: <strong>${currentCard.ukrainian || "Невідомо"}</strong>
        </div>
    `;

  // Відображення зміни рівня (з повним захистом)
  let levelChange = "";
  try {
    if (
      newMastery &&
      oldMastery &&
      newMastery.masteryLevel !== undefined &&
      oldMastery.masteryLevel !== undefined
    ) {
      if (newMastery.masteryLevel > oldMastery.masteryLevel) {
        levelChange = `<div class="level-up">🎉 Рівень підвищено до ${this.getRomanNumeral(
          newMastery.masteryLevel
        )}!</div>`;
      } else if (newMastery.masteryLevel < oldMastery.masteryLevel) {
        levelChange = `<div class="level-down">⚠️ Рівень знижено до ${this.getRomanNumeral(
          newMastery.masteryLevel
        )}</div>`;
      }
    }
  } catch (error) {
    console.error("Помилка відображення зміни рівня:", error);
  }

  resultMessageElement.innerHTML = message + levelChange;
  correctAnswerElement.innerHTML = correctAnswer;

  // Оновлення інформації про майстерність (з перевіркою)
  try {
    if (
      currentMasteryElement &&
      newMastery &&
      newMastery.masteryLevel !== undefined
    ) {
      currentMasteryElement.textContent = this.getRomanNumeral(
        newMastery.masteryLevel
      );
    }
    if (
      currentStabilityElement &&
      newMastery &&
      newMastery.stability !== undefined
    ) {
      currentStabilityElement.textContent = newMastery.stability;
    }
  } catch (error) {
    console.error("Помилка оновлення інформації про майстерність:", error);
  }

  // Перехід до наступного екрану
  document.getElementById("test-process").classList.add("hidden");
  document.getElementById("question-result").classList.remove("hidden");
};

WordLearningApp.prototype.getRomanNumeral = function (level) {
  try {
    const num = parseInt(level);
    if (isNaN(num) || num < 1) return "I";
    if (num > 10) return "X";

    const numerals = [
      "",
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
      "VII",
      "VIII",
      "IX",
      "X",
    ];
    return numerals[num] || "I";
  } catch (error) {
    return "I";
  }
};

WordLearningApp.prototype.nextQuestion = function () {
  // Перевірка, чи є ще картки
  if (this.currentTest.currentIndex < this.currentTest.cards.length - 1) {
    this.currentTest.currentIndex++;
    this.showTestQuestion();
  } else {
    this.completeTest();
  }
};

WordLearningApp.prototype.checkAnswer = function () {
  const userTranslation = document
    .getElementById("user-translation")
    .value.trim();
  const userTranscription = document
    .getElementById("user-transcription")
    .value.trim();

  if (!userTranslation) {
    showAlert("Будь ласка, введіть переклад!", "Увага", "warning");
    return;
  }

  const currentCard = this.currentTest.cards[this.currentCardIndex];
  const result = testingSystem.checkAnswer(
    currentCard.id,
    userTranslation,
    userTranscription
  );

  // Збереження відповіді
  this.currentTest.userAnswers.push({
    cardId: currentCard.id,
    userTranslation,
    userTranscription,
    ...result,
  });
  // Відображення результату
  this.showQuestionResult(result);
};

WordLearningApp.prototype.completeTest = function () {
  const results = testingSystem.completeTest();

  // Визначення оцінки за успішністю
  let gradeClass = "";
  let gradeText = "";
  if (results.successRate >= 90) {
    gradeClass = "result-excellent";
    gradeText = "Відмінно!";
  } else if (results.successRate >= 70) {
    gradeClass = "result-good";
    gradeText = "Добре!";
  } else if (results.successRate >= 50) {
    gradeClass = "result-average";
    gradeText = "Задовільно";
  } else {
    gradeClass = "result-poor";
    gradeText = "Треба повторити";
  }

  document.getElementById("results-stats").innerHTML = `
        <div class="test-result-summary">
            <h4 class="${gradeClass}">${gradeText}</h4>
            <p>Результат: <strong>${results.correctAnswers}/${
    results.totalQuestions
  }</strong></p>
            <p>Успішність: <strong class="${gradeClass}">${
    results.successRate
  }%</strong></p>
            <p>Час: <strong>${results.duration} секунд</strong></p>
            <p>Середній час на питання: <strong>${Math.round(
              results.duration / results.totalQuestions
            )} сек</strong></p>
        </div>
    `;

  document.getElementById("question-result").classList.add("hidden");
  document.getElementById("test-results").classList.remove("hidden");
  this.updateTestingStatistics();
};

WordLearningApp.prototype.showTestSettings = function () {
  document.getElementById("test-settings").classList.remove("hidden");
  document.getElementById("test-process").classList.add("hidden");
  document.getElementById("question-result").classList.add("hidden");
  document.getElementById("test-results").classList.add("hidden");
};

WordLearningApp.prototype.reviewMistakes = function () {
  if (!this.currentTest) return;

  // Знаходимо картки з помилками
  const mistakeCards = this.currentTest.userAnswers
    .filter((answer) => !answer.isCorrect)
    .map((answer) => DataManager.getCardById(answer.cardId))
    .filter((card) => card !== undefined);

  if (mistakeCards.length === 0) {
    showAlert("У цьому тесті не було помилок!", "Інформація", "info");
    return;
  }

  // Створюємо новий тест тільки з помилками
  this.currentTest = {
    id: Date.now().toString() + "-review",
    startTime: new Date().toISOString(),
    cards: mistakeCards,
    currentIndex: 0,
    userAnswers: [],
    completed: false,
  };

  this.showTestQuestion();
};

WordLearningApp.prototype.loadTestCategories = function () {
  const categories = DataManager.getCategories();
  const categorySelect = document.getElementById("test-category");

  if (categorySelect) {
    categorySelect.innerHTML =
      '<option value="all">Всі категорії</option>' +
      categories
        .map((cat) => `<option value="${cat}">${cat}</option>`)
        .join("");
  }
};

WordLearningApp.prototype.updateAvailableCardsCount = function () {
  const allCards = DataManager.getAllCards();
  const countElement = document.getElementById("available-cards-count");
  if (countElement) {
    countElement.textContent = allCards.length;
  }
};

WordLearningApp.prototype.updateTestingStatistics = function () {
  const stats = testingSystem.getTestingStatistics();
  const container = document.getElementById("testing-stats-container");

  if (container) {
    container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>${stats.totalTests}</h3>
                    <p>Всього тестів</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.averageSuccessRate}%</h3>
                    <p>Середня успішність</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.totalMasteredCards}</h3>
                    <p>Слів освоєно</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.totalTestedCards}</h3>
                    <p>Слів протестовано</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.averageMasteryLevel}</h3>
                    <p>Середній рівень</p>
                </div>
            </div>
            
            <div class="mastery-chart">
                <h4>Розподіл за рівнями майстерності:</h4>
                <div class="mastery-bars">
                    ${Object.entries(stats.masteryDistribution)
                      .map(
                        ([level, count]) => `
                        <div class="mastery-bar-item">
                            <span class="mastery-level">${this.getRomanNumeral(
                              level
                            )}</span>
                            <div class="mastery-bar-container">
                                <div class="mastery-bar" style="width: ${
                                  (count /
                                    Math.max(1, stats.totalTestedCards)) *
                                  100
                                }%"></div>
                            </div>
                            <span class="mastery-count">${count}</span>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `;
  }
};

// Глобальні функції для експорту/імпорту даних тестування
async function exportTestingData() {
  try {
    const data = testingSystem.exportTestingData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `testing-backup-${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    showAlert("Помилка експорту статистики тестування", "Помилка", "error");
  }
}

async function importTestingData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const result = await showConfirm(
        "Імпортувати статистику тестування? Поточні дані будуть перезаписані.",
        "Імпорт статистики"
      );

      if (result) {
        if (testingSystem.importTestingData(e.target.result)) {
          showAlert(
            "Статистику тестування успішно імпортовано!",
            "Успіх",
            "success"
          );
          if (window.app) {
            window.app.updateTestingStatistics();
          }
        } else {
          showAlert(
            "Помилка імпорту статистики тестування",
            "Помилка",
            "error"
          );
        }
      }
    } catch (error) {
      showAlert("Помилка читання файлу: " + error.message, "Помилка", "error");
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}

async function resetTestingData() {
  const result = await showConfirm(
    "Ви впевнені, що хочете скинути всю статистику тестування? Ця дія незворотна.",
    "Скинути статистику тестування"
  );

  if (result) {
    testingSystem.masteryData.clear();
    testingSystem.testHistory = [];
    testingSystem.saveTestingData();

    await showAlert(
      "Статистику тестування успішно скинуто!",
      "Скидання завершено",
      "success"
    );

    if (window.app) {
      window.app.updateTestingStatistics();
    }
  }
}
