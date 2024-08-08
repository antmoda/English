async function fetchRandomWords() {
  try {
    // Параллельная загрузка всех JSON файлов
    const [
      verbsResponse,
      nounsResponse,
      additionalNounsResponse,
      climateNounsResponse,
      adjectivesResponse,
      adverbsResponse,
    ] = await Promise.all([
      fetch("json/verbs.json"),
      fetch("json/nouns-carier.json"),
      fetch("json/nouns-rest.json"),
      fetch("json/climate.json"),
      fetch("json/adjectives.json"),
      fetch("json/adverbs.json"),
    ]);

    // Парсинг JSON данных
    const [
      verbsData,
      nounsData,
      additionalNounsData,
      climateNounsData,
      adjectivesData,
      adverbsData,
    ] = await Promise.all([
      verbsResponse.json(),
      nounsResponse.json(),
      additionalNounsResponse.json(),
      climateNounsResponse.json(),
      adjectivesResponse.json(),
      adverbsResponse.json(),
    ]);

    // Генерация случайных индексов и выбор случайных слов
    const randomWords = [
      verbsData.words[Math.floor(Math.random() * verbsData.words.length)],
      nounsData.words[Math.floor(Math.random() * nounsData.words.length)],
      additionalNounsData.words[
        Math.floor(Math.random() * additionalNounsData.words.length)
      ],
      climateNounsData.words[
        Math.floor(Math.random() * climateNounsData.words.length)
      ],
      adjectivesData.words[
        Math.floor(Math.random() * adjectivesData.words.length)
      ],
      adverbsData.words[Math.floor(Math.random() * adverbsData.words.length)],
    ];

    // Получение элементов DOM
    const randomWordsElements = document.getElementsByClassName("random-words");

    // Вставка случайных слов в DOM
    Array.from(randomWordsElements).forEach((element, index) => {
      if (randomWords[index]) {
        element.innerHTML = `
			<tr>
			  <td>${randomWords[index].word}</td>
			  <td>${randomWords[index].transcription}</td>
			  <td>${randomWords[index].translation}</td>
			</tr>
		  `;
      }
    });
  } catch (error) {
    console.error("Error fetching words:", error);
  }
}

window.onload = fetchRandomWords;
