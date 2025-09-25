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

  // Додайте цей метод в клас TTSManager після методу speak()
  playExternalAudio(audioUrl) {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audio.play().catch((error) => {
      console.error("Помилка відтворення аудіо:", error);
      alert("Не вдалося відтворити аудіо. Перевірте посилання.");
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

    // ВИПРАВЛЕННЯ 2: Правильна перевірка на зовнішнє аудіо
    if (
      card &&
      card.audioConfig &&
      card.audioConfig.source === "external" &&
      card.audioConfig.url
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
      button.onclick = null; // Видаляємо попередні обробники
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

// Головний клас додатка
class WordLearningApp {
  updateStorageStats(storageStats, recommendations) {
    // Оновлення основних показників
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

    // Оновлення рекомендацій
    const recommendationElement = document.getElementById(
      "storage-recommendation"
    );
    if (recommendationElement) {
      recommendationElement.textContent = recommendations.message;
      recommendationElement.className = "storage-recommendation";

      // Додаємо клас в залежності від типу рекомендації
      if (recommendations.type === "warning") {
        recommendationElement.classList.add("warning");
      } else if (recommendations.type === "error") {
        recommendationElement.classList.add("critical");
      } else {
        recommendationElement.classList.add("success");
      }
    }

    // Зміна кольору картки використання сховища в залежності від заповненості
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

        // Видаляємо активний клас з усіх кнопок та контенту
        tabBtns.forEach((b) => b.classList.remove("active"));
        tabContents.forEach((content) => content.classList.remove("active"));

        // Додаємо активний клас до поточної кнопки та контенту
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
    this.btnRemembered = document.getElementById("btn-remembered");
    this.btnForgot = document.getElementById("btn-forgot");
    this.btnEdit = document.getElementById("btn-edit");
    this.btnRestart = document.getElementById("btn-restart");

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
    if (this.btnPrev)
      this.btnPrev.addEventListener("click", () => this.showPreviousCard());
    if (this.btnNext)
      this.btnNext.addEventListener("click", () => this.showNextCard());
    if (this.btnRemembered)
      this.btnRemembered.addEventListener("click", () =>
        this.markAsRemembered()
      );
    if (this.btnForgot)
      this.btnForgot.addEventListener("click", () => this.markAsForgotten());
    if (this.btnEdit)
      this.btnEdit.addEventListener("click", () => this.editCurrentCard());
    if (this.btnRestart)
      this.btnRestart.addEventListener("click", () => this.restartStudy());

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
    // TTS для вивчення
    if (this.playWordAudioBtn) {
      this.playWordAudioBtn.addEventListener("click", () => this.playWordTTS());
    }

    // TTS для прикладів у режимі вивчення
    document.querySelectorAll(".play-example-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const exampleNumber =
          e.target.getAttribute("data-example") ||
          e.target.closest(".play-example-btn").getAttribute("data-example");
        this.playExampleTTS(exampleNumber);
      });
    });

    // TTS для створення карток
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

    // TTS для редагування карток
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
      case "1":
        this.markAsRemembered();
        break;
      case "2":
        this.markAsForgotten();
        break;
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
    const storageStats = DataManager.getStorageStats();
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

    // 🔹 Категорії
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
        </div>
      `
        )
        .join("");
    }

    // 🔹 Інформація про сховище - ОНОВЛЕНА ВЕРСІЯ
    let statusClass = "";
    let statusIcon = "✅";

    if (storageStats.isCritical) {
      statusClass = "stat-card-error";
      statusIcon = "⚡️";
    } else if (storageStats.isNearLimit) {
      statusClass = "stat-card-warning";
      statusIcon = "⚠️";
    }

    const storageHTML = `
        <div class="stat-card ${statusClass}">
            <h3>${statusIcon} ${storageStats.usagePercentage}%</h3>
            <p>Використано сховища</p>
            <div class="storage-details">
                <small>${storageStats.currentSizeMB} MB / ${storageStats.limitMB} MB</small>
                <small>Залишилось: ${storageStats.remainingMB} MB</small>
                <small>Карток: ${storageStats.cardsCount}</small>
            </div>
        </div>
    `;

    // Додати до контейнера статистики
    const statsContainer = document.getElementById("statistics-container");
    if (statsContainer) {
      // Знайти існуючу картку сховища або додати нову
      let storageCard = statsContainer.querySelector(".storage-stat-card");
      if (!storageCard) {
        storageCard = document.createElement("div");
        storageCard.className = "storage-stat-card";
        statsContainer.appendChild(storageCard);
      }
      storageCard.innerHTML = storageHTML;
    }
    // 🔹 Інформація про сховище
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

  // Додати в клас WordLearningApp
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

  // Додати методи для роботи з категоріями
  deleteCategory(categoryName) {
    if (categoryName === "Загальні") {
      alert("Категорію 'Загальні' не можна видалити");
      return;
    }

    const cardsInCategory = DataManager.getCardsByCategory(categoryName);

    if (cardsInCategory.length > 0) {
      if (
        confirm(
          `У категорії "${categoryName}" є ${cardsInCategory.length} карток. Перемістити їх до категорії "Загальні" перед видаленням?`
        )
      ) {
        const success = DataManager.moveCardsToCategory(
          categoryName,
          "Загальні"
        );
        if (success) {
          const result = DataManager.deleteCategory(categoryName);
          alert(result.message);
          this.updateCategoriesList();
          this.loadCategories(); // Оновити випадаючі списки
        }
      }
    } else {
      if (
        confirm(`Ви впевнені, що хочете видалити категорію "${categoryName}"?`)
      ) {
        const result = DataManager.deleteCategory(categoryName);
        alert(result.message);
        this.updateCategoriesList();
        this.loadCategories();
      }
    }
  }

  // Оновити CSS для кращого вигляду кнопок

  startCategoryStudy(category) {
    this.currentCategory = category;
    if (this.categorySelect) {
      this.categorySelect.value = category;
    }
    this.showSection("study");
  }

  startStudy() {
    this.studyMode = "normal";
    this.beginStudy();
  }

  startReview() {
    this.studyMode = "review";
    this.beginStudy();
  }

  startDifficult() {
    this.studyMode = "difficult";
    this.beginStudy();
  }

  beginStudy() {
    const cards = DataManager.getCardsForStudy(
      this.currentCategory,
      this.studyMode
    );

    if (cards.length === 0) {
      alert("Немає карток для вивчення в цій категорії!");
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

    // Оновлення даних картки
    this.cardWord.textContent = card.english;
    this.cardTranscription.textContent = card.transcription || "";
    this.cardTranslation.textContent = card.ukrainian; // Тепер це h2
    this.cardExample1.textContent = card.example1 || "";
    this.cardExample2.textContent = card.example2 || "";

    // Оновлення зображення на задній стороні
    this.updateCardImage(card);

    // Оновлення зображення на фронтальній стороні
    this.updateFrontCardImage(card);

    // Решта коду залишається без змін...
    ttsManager.resetCounter("current-word");
    ttsManager.resetCounter("current-example1");
    ttsManager.resetCounter("current-example2");

    ttsManager.updateButtonState("play-word-audio", "current-word", card);
    ttsManager.updateButtonState("play-example1", "current-example1", card);
    ttsManager.updateButtonState("play-example2", "current-example2", card);

    this.updateAudioStatuses();
  }

  updateCardImage(card) {
    const existingContainer = document.getElementById("card-image-container");
    if (existingContainer) existingContainer.remove();

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

      // Додаємо зображення на задню сторону
      const backSide = document.querySelector(".flashcard-back");
      if (backSide) {
        // Знаходимо основний контент
        const mainContent = backSide.querySelector(".flashcard-main-content");
        if (mainContent) {
          // Додаємо зображення після перекладу (тепер h2)
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

      // Додаємо зображення на фронтальну сторону
      const frontSide = document.querySelector(".flashcard-front");
      if (frontSide) {
        // Знаходимо основний контент
        const mainContent = frontSide.querySelector(".flashcard-main-content");
        if (mainContent) {
          // Додаємо зображення після транскрипції
          const transcriptionElement = mainContent.querySelector(
            "#card-transcription-text"
          );
          if (transcriptionElement) {
            mainContent.insertBefore(
              imageContainer,
              transcriptionElement.nextSibling
            );
          } else {
            // Якщо немає транскрипції, додаємо після слова
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

  completeStudy() {
    alert("Вивчення завершено! Всі картки пройдено.");
    this.stopStudy();
  }

  markAsRemembered() {
    const card = this.currentCards[this.currentCardIndex];
    DataManager.updateCardProgress(card.id, true);
    this.showNextCard();
  }

  markAsForgotten() {
    const card = this.currentCards[this.currentCardIndex];
    DataManager.updateCardProgress(card.id, false);
    this.showNextCard();
  }

  editCurrentCard() {
    if (this.currentCards.length === 0) {
      alert("Спочатку почніть навчання, картки відсутні");
      return;
    }

    const card = this.currentCards[this.currentCardIndex];
    if (!card) {
      alert("Картка не знайдена");
      return;
    }

    this.showEditModal(card);
  }

  editCurrentCard() {
    // Перевірка наявності карток та коректного індексу
    if (
      !this.isStudying ||
      this.currentCards.length === 0 ||
      this.currentCardIndex >= this.currentCards.length
    ) {
      alert("Спочатку почніть навчання, картки відсутні");
      return;
    }

    const card = this.currentCards[this.currentCardIndex];

    // Додаткова перевірка наявності картки
    if (!card || !card.id) {
      alert("Картка не знайдена або не має ідентифікатора");
      return;
    }

    this.showEditModal(card);
  }

  showEditModal(card) {
    if (!card || !card.id) {
      alert("Картка не знайдена");
      return;
    }

    // Заповнення форми редагування
    this.editCardId.value = card.id;
    this.editCardEnglish.value = card.english || "";
    this.editCardTranscription.value = card.transcription || "";
    this.editCardTranslation.value = card.ukrainian || "";
    this.editCardExample1.value = card.example1 || "";
    this.editCardExample2.value = card.example2 || "";

    // ВИПРАВЛЕННЯ: Правильне отримання URL аудіо
    this.editCardAudioUrl.value = card.audioConfig?.url || "";
    this.editCardFrontImageUrl.value = card.frontImageUrl || "";
    this.editCardImageUrl.value = card.imageUrl || "";

    if (this.editCardCategory) {
      this.editCardCategory.value = card.category || "Загальні";
    }

    // Оновлення TTS кнопок для редагування
    ttsManager.resetCounter("edit-word");
    ttsManager.resetCounter("edit-example1");
    ttsManager.resetCounter("edit-example2");

    ttsManager.updateButtonState("edit-preview-word-tts", "edit-word");
    ttsManager.updateButtonState("edit-preview-example1-tts", "edit-example1");
    ttsManager.updateButtonState("edit-preview-example2-tts", "edit-example2");

    // Показуємо модальне вікно
    this.editModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  handleEditCard() {
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

    // Перевірка обов'язкових полів
    if (!cardData.id || !cardData.english || !cardData.ukrainian) {
      alert("Будь ласка, заповніть обов'язкові поля");
      return;
    }

    // Виклик DataManager для оновлення картки
    const success = DataManager.updateCard(cardData);

    if (success) {
      this.hideEditModal();

      // Оновлюємо поточний набір карток, якщо ми в режимі вивчення
      if (this.isStudying) {
        this.restartStudy();
      }

      alert("Картку успішно оновлено!");
    } else {
      alert("Помилка при оновленні картки!");
    }
  }

  deleteCurrentCard() {
    if (!confirm("Ви впевнені, що хочете видалити цю картку?")) return;

    const cardId = this.editCardId.value;
    DataManager.deleteCard(cardId);
    this.hideEditModal();

    if (this.isStudying) {
      this.restartStudy();
    }

    alert("Картку успішно видалено!");
  }

  async handleCreateCard(e) {
    e.preventDefault();

    try {
      // ВИПРАВЛЕННЯ 1: Правильне отримання категорії
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
        alert("Будь ласка, заповніть обов'язкові поля");
        return;
      }

      // Викликаємо створення картки з обробкою помилок
      DataManager.createCard(cardData);

      this.createForm.reset();

      // Скидання до першої вкладки
      document
        .querySelectorAll(".tab-btn")
        .forEach((btn) => btn.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((content) => content.classList.remove("active"));
      document.querySelector('[data-tab="front"]').classList.add("active");
      document.getElementById("front-tab").classList.add("active");

      // Скидання TTS лічильників
      ttsManager.resetCounter("create-word");
      ttsManager.resetCounter("create-example1");
      ttsManager.resetCounter("create-example2");

      this.updateTTSStatuses();

      alert("Картку успішно створено!");
      this.loadCategories();
    } catch (error) {
      console.error("Помилка при створенні картки:", error);
      alert(`Помилка при створенні картки: ${error.message}`);
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
    const elementId = `current-example${exampleNumber}`;

    const result = await ttsManager.playWithLimit(elementId, exampleText);

    const statusElement = document
      .querySelector(`#card-example${exampleNumber}`)
      .closest(".example-item")
      .querySelector(".example-audio-status");
    if (statusElement) {
      this.updateAudioStatusElement(statusElement, result);
    }

    ttsManager.updateButtonState(`play-example${exampleNumber}`, elementId);
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
function exportData() {
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
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const importedData = JSON.parse(e.target.result);
      if (
        confirm(
          "Ви впевнені, що хочете імпортувати дані? Поточні дані будуть об'єднані з імпортованими."
        )
      ) {
        if (DataManager.importData(JSON.stringify(importedData))) {
          alert("Дані успішно імпортовано!");
          location.reload();
        } else {
          alert("Помилка імпорту даних.");
        }
      }
    } catch (error) {
      alert("Помилка читання файлу: " + error.message);
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}

// Глобальні функції для кнопок
function resetAllProgress() {
  if (
    confirm("Ви впевнені, що хочете скинути весь прогрес? Ця дія незворотна.")
  ) {
    DataManager.resetAllProgress();
    alert("Прогрес скинуто!");
    if (window.app) {
      window.app.updateStatistics();
    }
  }
}

function resetCardIntervals() {
  if (confirm("Скинути інтервали повторень для всіх карток?")) {
    DataManager.resetCardIntervals();
    alert("Інтервали скинуто!");
  }
}

// Ініціалізація додатка
document.addEventListener("DOMContentLoaded", function () {
  window.app = new WordLearningApp();
});
