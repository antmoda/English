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
    this.cardImage = document.createElement("img");
    this.currentPosition = document.getElementById("current-position");
    this.totalCards = document.getElementById("total-cards");

    // Аудіо елементи
    this.playAudioBtn = document.getElementById("play-audio-btn");
    this.audioStatus = document.getElementById("audio-status");
    this.audioPlayer = new Audio();

    // Кнопки управління
    this.btnPrev = document.getElementById("btn-prev");
    this.btnNext = document.getElementById("btn-next");
    this.btnRemembered = document.getElementById("btn-remembered");
    this.btnForgot = document.getElementById("btn-forgot");
    this.btnEdit = document.getElementById("btn-edit");

    // Форма створення
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
    this.cardImageUrlInput = document.getElementById("card-image-url");
    this.cardAudioUrlInput = document.getElementById("card-audio-url");
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
    this.editCardImageUrl = document.getElementById("edit-card-image-url");
    this.editCardAudioUrl = document.getElementById("edit-card-audio-url");
    this.editCardTranslation = document.getElementById("edit-card-translation");
    this.editCardExample1 = document.getElementById("edit-card-example1");
    this.editCardExample2 = document.getElementById("edit-card-example2");
    this.editCardCategory = document.getElementById("edit-card-category");

    this.setupAudioButton();
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

  setupAudioButton() {
    if (this.playAudioBtn) {
      this.playAudioBtn.addEventListener("click", () => {
        this.playAudio();
      });
    }

    if (this.audioPlayer) {
      this.audioPlayer.onended = () => {
        if (this.audioStatus) {
          this.audioStatus.textContent = "Готово до відтворення";
        }
      };

      this.audioPlayer.onerror = () => {
        if (this.audioStatus) {
          this.audioStatus.textContent = "Помилка відтворення";
        }
      };
    }
  }

  bindEvents() {
    // Навігація
    if (this.navButtons.study)
      this.navButtons.study.addEventListener("click", () =>
        this.showSection("study")
      );
    if (this.navButtons.create)
      this.navButtons.create.addEventListener("click", () =>
        this.showSection("create")
      );
    if (this.navButtons.categories)
      this.navButtons.categories.addEventListener("click", () =>
        this.showSection("categories")
      );
    if (this.navButtons.stats)
      this.navButtons.stats.addEventListener("click", () =>
        this.showStatsSection()
      );

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

    // Обробка клавіш
    document.addEventListener("keydown", (e) => this.handleKeyPress(e));
  }

  handleKeyPress(e) {
    if (!this.isStudying) return;

    switch (e.key) {
      case "ArrowLeft":
        this.showPreviousCard();
        break;
      case "ArrowRight":
      case " ":
        e.preventDefault();
        this.showNextCard();
        break;
      case "r":
        this.markAsRemembered();
        break;
      case "f":
        this.markAsForgotten();
        break;
      case "e":
        this.editCurrentCard();
        break;
      case "Escape":
        if (!this.editModal.classList.contains("hidden")) {
          this.hideEditModal();
        } else {
          this.stopStudy();
        }
        break;
    }
  }

  showSection(sectionName) {
    // Приховати всі секції
    Object.values(this.sections).forEach((section) => {
      if (section) section.classList.remove("active");
    });

    // Деактивувати всі кнопки
    Object.values(this.navButtons).forEach((btn) => {
      if (btn) btn.classList.remove("active");
    });

    // Показати обрану секцію
    if (this.sections[sectionName]) {
      this.sections[sectionName].classList.add("active");
    }
    if (this.navButtons[sectionName]) {
      this.navButtons[sectionName].classList.add("active");
    }

    // Оновити категорії при переході на відповідні секції
    if (sectionName === "study" || sectionName === "create") {
      this.loadCategories();
    }

    // Зупинити вивчення при переході на іншу секцію
    if (sectionName !== "study" && this.isStudying) {
      this.stopStudy();
    }
  }

  showStatsSection() {
    this.updateStatistics();
    this.showSection("stats");
  }

  updateStatistics() {
    const stats = DataManager.getStatistics();
    const progress = DataManager.getCategoryProgress();

    // Оновити основну статистику
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

    // Оновити прогрес по категоріях
    const progressContainer = document.getElementById("category-progress");
    if (progressContainer) {
      progressContainer.innerHTML = "";

      Object.entries(progress).forEach(([category, data]) => {
        if (data.total > 0) {
          const progressItem = document.createElement("div");
          progressItem.className = "category-progress-item";
          progressItem.innerHTML = `
                        <strong>${category}</strong>: ${data.studied}/${data.total} вивчено
                        <div class="progress-bar-container">
                            <div class="progress-bar-fill" style="width: ${data.percentage}%"></div>
                        </div>
                        <small>${data.percentage}% завершено</small>
                    `;
          progressContainer.appendChild(progressItem);
        }
      });
    }
  }

  loadCategories() {
    const categories = DataManager.getCategories();

    // Оновити вибір категорій для вивчення
    if (this.categorySelect) {
      this.categorySelect.innerHTML =
        '<option value="all">Всі категорії</option>';
      categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        if (category === this.currentCategory) {
          option.selected = true;
        }
        this.categorySelect.appendChild(option);
      });
    }

    // Оновити вибір категорій для створення
    if (this.cardCategorySelect) {
      this.cardCategorySelect.innerHTML =
        '<option value="">-- Оберіть категорію --</option>';
      categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        this.cardCategorySelect.appendChild(option);
      });
    }

    // Оновити список категорій для перегляду
    this.updateCategoriesList();
  }

  updateCategoriesList() {
    const categoriesList = document.getElementById("categories-list");
    const categories = DataManager.getCategories();

    if (!categoriesList) return;

    categoriesList.innerHTML = "";

    if (categories.length === 0) {
      categoriesList.innerHTML =
        '<p class="no-data">Ще немає категорій. Створіть першу картку!</p>';
      return;
    }

    categories.forEach((category) => {
      const cardsInCategory = DataManager.getCardsByCategory(category);
      const categoryCard = document.createElement("div");
      categoryCard.className = "category-card";
      categoryCard.innerHTML = `
                <h3>${category}</h3>
                <p>Карток: ${cardsInCategory.length}</p>
                <p>Всього вивчень: ${cardsInCategory.reduce(
                  (sum, card) => sum + card.stats.studied,
                  0
                )}</p>
            `;

      categoryCard.addEventListener("click", () => {
        this.currentCategory = category;
        if (this.categorySelect) this.categorySelect.value = category;
        this.showSection("study");
      });

      categoriesList.appendChild(categoryCard);
    });
  }

  startStudy() {
    this.studyMode = "normal";
    this.currentCards = DataManager.getCardsByCategory(this.currentCategory);
    this.startLearningSession();
  }

  startReview() {
    this.studyMode = "review";
    this.currentCards = DataManager.getCardsForReview();
    this.startLearningSession();
  }

  startDifficult() {
    this.studyMode = "difficult";
    this.currentCards = DataManager.getDifficultCards();
    this.startLearningSession();
  }

  startLearningSession() {
    if (this.currentCards.length === 0) {
      let message = "Немає карток для вивчення!";
      if (this.studyMode === "review") {
        message =
          "Вітаємо! На сьогодні всі слова вивчені. Повторення не потрібні.";
      } else if (this.studyMode === "difficult") {
        message = "У вас немає складних слів. Відмінно!";
      }
      alert(message);
      return;
    }

    this.currentCardIndex = 0;
    this.isStudying = true;
    if (this.totalCards) this.totalCards.textContent = this.currentCards.length;
    if (this.flashcardContainer)
      this.flashcardContainer.classList.remove("hidden");
    this.showCurrentCard();

    // Оновити інтерфейс
    if (this.startStudyBtn) this.startStudyBtn.textContent = "Перезапустити";
    if (this.categorySelect) this.categorySelect.disabled = true;
  }

  restartStudy() {
    this.stopStudy();
    this.startStudy();
  }

  stopStudy() {
    this.isStudying = false;
    if (this.flashcardContainer)
      this.flashcardContainer.classList.add("hidden");
    if (this.startStudyBtn) this.startStudyBtn.textContent = "Почати вивчення";
    if (this.categorySelect) this.categorySelect.disabled = false;
  }

  showCurrentCard() {
    if (this.currentCards.length === 0) return;

    const card = this.currentCards[this.currentCardIndex];
    if (this.cardWord) this.cardWord.textContent = card.word;
    if (this.cardTranscription)
      this.cardTranscription.textContent = card.transcription || "";
    if (this.cardTranslation)
      this.cardTranslation.textContent = card.translation;
    if (this.cardExample1) this.cardExample1.textContent = card.examples[0];
    if (this.cardExample2) this.cardExample2.textContent = card.examples[1];
    if (this.currentPosition)
      this.currentPosition.textContent = this.currentCardIndex + 1;

    this.showSpacedRepetitionInfo(card);
    this.updateCardImage(card.imageUrl);
    this.setupAudioPlayer(card.audioUrl);

    const flashcard = document.querySelector(".flashcard");
    if (flashcard) flashcard.classList.remove("flipped");

    this.updateProgressBar();
  }

  setupAudioPlayer(audioUrl) {
    const audioContainer = document.querySelector(".audio-player");
    if (!audioContainer) return;

    if (audioUrl) {
      audioContainer.style.display = "flex";
      this.audioPlayer.src = audioUrl;
      if (this.audioStatus) {
        this.audioStatus.textContent = "Готово до відтворення";
      }
    } else {
      audioContainer.style.display = "none";
    }
  }

  playAudio() {
    if (this.audioPlayer.src) {
      this.audioPlayer.play();
      if (this.audioStatus) {
        this.audioStatus.textContent = "Відтворення...";
      }
    }
  }

  showSpacedRepetitionInfo(card) {
    const oldInfo = document.querySelector(".repetition-info");
    if (oldInfo) {
      oldInfo.remove();
    }

    if (this.studyMode === "review" || this.studyMode === "difficult") {
      const sr = card.spacedRepetition;
      const infoDiv = document.createElement("div");
      infoDiv.className = "repetition-info";
      infoDiv.style.marginTop = "10px";
      infoDiv.style.fontSize = "14px";
      infoDiv.style.color = "#7f8c8d";

      let infoText = "";
      if (this.studyMode === "review") {
        infoText = `Повторення: ${sr.repetition} | Інтервал: ${sr.interval} дн.`;
      } else {
        const difficulty = sr.easeFactor < 1.5 ? "Дуже складно" : "Складно";
        infoText = `Складність: ${difficulty} | Повторень: ${sr.repetition}`;
      }

      infoDiv.textContent = infoText;

      const frontSide = document.querySelector(".flashcard-front");
      const transcriptionElement = document.getElementById(
        "card-transcription-text"
      );
      if (frontSide && transcriptionElement) {
        frontSide.insertBefore(infoDiv, transcriptionElement.nextSibling);
      }
    }
  }

  updateCardImage(imageUrl) {
    const existingImage = document.querySelector(".card-image");
    if (existingImage) {
      existingImage.remove();
    }

    if (imageUrl) {
      this.cardImage.src = imageUrl;
      this.cardImage.alt = "Зображення для слова";
      this.cardImage.className = "card-image";

      const frontSide = document.querySelector(".flashcard-front");
      const wordElement = document.getElementById("card-word");
      if (frontSide && wordElement) {
        frontSide.insertBefore(this.cardImage, wordElement.nextSibling);
      }
    }
  }

  showNextCard() {
    if (this.currentCardIndex < this.currentCards.length - 1) {
      this.currentCardIndex++;
      this.showCurrentCard();
    } else {
      alert("Вітаємо! Ви вивчили всі картки в цій категорії!");
      this.stopStudy();
    }
  }

  showPreviousCard() {
    if (this.currentCardIndex > 0) {
      this.currentCardIndex--;
      this.showCurrentCard();
    }
  }

  updateProgressBar() {
    const progress =
      ((this.currentCardIndex + 1) / this.currentCards.length) * 100;
    const progressFill = document.querySelector(".progress-fill");
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }
  }

  markAsRemembered() {
    const cardId = this.currentCards[this.currentCardIndex].id;
    DataManager.updateCardStats(cardId, true);
    this.showNextCard();
  }

  markAsForgotten() {
    const cardId = this.currentCards[this.currentCardIndex].id;
    DataManager.updateCardStats(cardId, false);
    this.showNextCard();
  }

  editCurrentCard() {
    if (this.currentCards.length === 0) return;

    const card = this.currentCards[this.currentCardIndex];
    this.fillEditForm(card);
    this.showEditModal();
  }

  fillEditForm(card) {
    if (!this.editCardId || !this.editCardEnglish) return;

    this.editCardId.value = card.id;
    this.editCardEnglish.value = card.word;
    this.editCardTranscription.value = card.transcription || "";
    this.editCardImageUrl.value = card.imageUrl || "";
    this.editCardAudioUrl.value = card.audioUrl || "";
    this.editCardTranslation.value = card.translation;
    this.editCardExample1.value = card.examples[0];
    this.editCardExample2.value = card.examples[1];

    // Заповнити вибір категорій
    if (this.editCardCategory) {
      this.editCardCategory.innerHTML =
        '<option value="">-- Оберіть категорію --</option>';
      DataManager.getCategories().forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        if (category === card.category) {
          option.selected = true;
        }
        this.editCardCategory.appendChild(option);
      });
    }
  }

  async handleEditCard() {
    if (!this.editCardId || !this.editCardEnglish) return;

    const cardId = this.editCardId.value;
    const word = this.editCardEnglish.value.trim();
    const transcription = this.editCardTranscription.value.trim();
    const translation = this.editCardTranslation.value.trim();
    const example1 = this.editCardExample1.value.trim();
    const example2 = this.editCardExample2.value.trim();
    const imageUrl = this.editCardImageUrl.value.trim();
    const audioUrl = this.editCardAudioUrl.value.trim();
    const category = this.editCardCategory ? this.editCardCategory.value : "";

    if (!word || !translation || !example1 || !example2) {
      alert("Будь ласка, заповніть обов'язкові поля!");
      return;
    }

    const success = await DataManager.updateCard(cardId, {
      word,
      transcription,
      translation,
      example1,
      example2,
      imageUrl,
      audioUrl,
      category: category || "Загальна",
    });

    if (success) {
      alert("Картку успішно оновлено!");
      this.hideEditModal();
      this.restartStudy();
      this.loadCategories();
    } else {
      alert("Помилка при оновленні картки.");
    }
  }

  async deleteCurrentCard() {
    if (
      !confirm(
        "Ви впевнені, що хочете видалити цю картку? Цю дію не можна скасувати."
      )
    ) {
      return;
    }

    const cardId = this.editCardId.value;
    const success = await DataManager.deleteCard(cardId);

    if (success) {
      alert("Картку успішно видалено!");
      this.hideEditModal();
      this.restartStudy();
      this.loadCategories();
    } else {
      alert("Помилка при видаленні картки.");
    }
  }

  async handleCreateCard(e) {
    e.preventDefault();

    const word = this.cardEnglish.value.trim();
    const transcription = this.cardTranscriptionInput.value.trim();
    const translation = this.cardTranslationInput.value.trim();
    const example1 = this.cardExample1Input.value.trim();
    const example2 = this.cardExample2Input.value.trim();
    const imageUrl = this.cardImageUrlInput.value.trim();
    const audioUrl = this.cardAudioUrlInput.value.trim();

    let category = this.cardCategorySelect.value;
    if (!category && this.cardCategoryNew.value.trim()) {
      category = this.cardCategoryNew.value.trim();
    }

    if (!word || !translation || !example1 || !example2) {
      alert(
        "Будь ласка, заповніть обов'язкові поля (слово, переклад та приклади)!"
      );
      return;
    }

    const newCard = await DataManager.addCard({
      word,
      transcription,
      translation,
      example1,
      example2,
      imageUrl,
      audioUrl,
      category: category || "Загальна",
    });

    if (newCard) {
      this.loadCategories();
      this.createForm.reset();
      alert(`Картку "${word}" успішно створено!`);
      this.showSection("study");
    } else {
      alert("Помилка при збереженні картки. Спробуйте ще раз.");
    }
  }
}

// Запуск додатка
document.addEventListener("DOMContentLoaded", async () => {
  await DataManager.loadData();
  window.app = new WordLearningApp();
});

// Додаткові утиліти
function exportData() {
  const data = DataManager.exportData();
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "flashcards-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    const success = await DataManager.importData(e.target.result);
    if (success) {
      alert("Дані успішно імпортовано! Оновлюємо сторінку...");
      location.reload();
    } else {
      alert("Помилка імпорту даних. Перевірте формат файлу.");
    }
  };
  reader.readAsText(file);
}

function addExportImportButtons() {
  const header = document.querySelector("header");
  if (!header) return;

  const exportImportDiv = document.createElement("div");
  exportImportDiv.style.marginTop = "15px";
  exportImportDiv.style.display = "flex";
  exportImportDiv.style.gap = "10px";
  exportImportDiv.style.alignItems = "center";
  exportImportDiv.style.justifyContent = "center";
  exportImportDiv.style.flexWrap = "wrap";

  // Кнопка експорту
  const exportButton = document.createElement("button");
  exportButton.className = "btn-secondary";
  exportButton.textContent = "Експорт даних";
  exportButton.onclick = exportData;
  exportImportDiv.appendChild(exportButton);

  // Контейнер для імпорту
  const importContainer = document.createElement("div");
  importContainer.className = "import-container";

  // Кнопка імпорту
  const importButton = document.createElement("button");
  importButton.className = "btn-secondary";
  importButton.textContent = "Імпорт даних";

  // Прихований input для завантаження файлу
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json";
  fileInput.addEventListener("change", importData);

  importContainer.appendChild(importButton);
  importContainer.appendChild(fileInput);
  exportImportDiv.appendChild(importContainer);

  header.appendChild(exportImportDiv);
}

setTimeout(addExportImportButtons, 1000);
