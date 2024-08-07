document
  .getElementById("sentenceForm")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const sentence = document.getElementById("sentence").value;

    // Отправка данных в Google Docs
    await fetch(
      "https://script.google.com/macros/s/AKfycbzrcSsCZHi2gljjVi4EUy5yarsK7hcLYyVGGf6aS-dhlUKaSVp_BqQ1Llnk09R7yI9phA/exec",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sentence }),
      }
    );

    alert("Sentence submitted successfully!");
  });
