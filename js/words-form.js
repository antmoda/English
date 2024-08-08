// script.js
document
  .getElementById("textForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const userInput = document.getElementById("userInput").value;

    // Получение существующего текста из файла (если есть)
    let existingText = localStorage.getItem("savedText") || "";

    // Добавление нового текста к существующему
    const newText = existingText
      ? `${existingText}\n\n${userInput}`
      : userInput;

    // Сохранение текста в локальное хранилище
    localStorage.setItem("savedText", newText);

    // Создание и скачивание файла
    const blob = new Blob([newText], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "userText.txt";
    link.click();

    alert("Текст сохранен в файл!");
  });
