document
  .getElementById("textForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const sections = document.querySelectorAll(".tense");
    let textToSave = "";

    sections.forEach((section) => {
      const heading = section.querySelector("h2").innerText;
      const inputs = section.querySelectorAll("input");
      let sectionText = `${heading}\n`;

      inputs.forEach((input) => {
        if (input.value.trim() !== "") {
          sectionText += `${input.value.trim()}\n`;
        }
      });

      if (sectionText.trim() !== heading) {
        textToSave += `${sectionText}---\n`;
      }
    });

    // Получение существующего текста из файла (если есть)
    let existingText = localStorage.getItem("savedText") || "";

    // Добавление даты сохранения перед новым текстом
    const currentDate = new Date().toLocaleString();
    const textWithDate = `${existingText}\n\nДата сохранения: ${currentDate}\n${textToSave}`;

    // Сохранение текста в локальное хранилище
    localStorage.setItem("savedText", textWithDate);

    // Создание и скачивание файла
    const blob = new Blob([textWithDate], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "practiceTenses.txt";
    link.click();

    alert("Текст сохранен в файл!");
  });
