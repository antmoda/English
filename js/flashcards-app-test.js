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

  disableTTSButtons() {
    const ttsButtons = document.querySelectorAll(
      ".tts-preview-btn, .play-example-btn"
    );
    ttsButtons.forEach((btn) => {
      btn.disabled = true;
      btn.title = "TTS не підтримується";
      btn.innerHTML = "❌";
    });
  }

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
          <small>Складність: ${data.averageDifficulty}</small>
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
    this.currentCategory = category;
    if (this.categorySelect) {
      this.categorySelect.value = category;
    }
    this.showSection("study");
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

    this.updateAudioStatuses();
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
      console.error("Помилка при створенні картки:", error);
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

  updateAudioStatuses() {
    const wordRemaining = ttsManager.getRemainingPlays("current-word");
    const example1Remaining = ttsManager.getRemainingPlays("current-example1");
    const example2Remaining = ttsManager.getRemainingPlays("current-example2");

    if (document.getElementById("word-audio-status")) {
      document.getElementById(
        "word-audio-status"
      ).textContent = `Готово (${wordRemaining} спроб)`;
    }

    document
      .querySelectorAll(".example-audio-status")
      .forEach((element, index) => {
        const remaining = index === 0 ? example1Remaining : example2Remaining;
        element.textContent = `(${remaining} спроб)`;
      });
  }
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

    // Не показуємо повідомлення про успіх - браузер сам покаже статус завантаження
    console.log("Експорт запущено - користувач побачить результат в браузері");

    // Звільняємо пам'ять через час
    setTimeout(() => {
      URL.revokeObjectURL(url);
      console.log("Пам'ять звільнено");
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

  console.log("Додаток ініціалізовано");
});
