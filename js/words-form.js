document
  .getElementById("textForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const userInput = document.getElementById("userInput").value;

    // Получение существующего текста из файла (если есть)
    let existingText = localStorage.getItem("savedText") || "";

    // Добавление даты сохранения
    const currentDate = new Date().toLocaleString();
    const textWithDate = `Дата сохранения: ${currentDate}\n${existingText}\n\n${userInput}`;

    // Сохранение текста в локальное хранилище
    localStorage.setItem("savedText", textWithDate);

    // Создание и скачивание файла
    const blob = new Blob([textWithDate], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "randomWords.txt";
    link.click();

    alert("Текст сохранен в файл!");
  });
