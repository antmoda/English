async function fetchRandomWords() {
  // Fetch verbs
  const verbsResponse = await fetch("json/verbs.json");
  const verbsData = await verbsResponse.json();
  const verbs = verbsData.words;
  const randomVerbIndex = Math.floor(Math.random() * verbs.length);
  const randomVerb = verbs[randomVerbIndex];

  // Fetch nouns
  const nounsResponse = await fetch("json/nouns-carier.json");
  const nounsData = await nounsResponse.json();
  const nouns = nounsData.words;
  const randomNounIndex = Math.floor(Math.random() * nouns.length);
  const randomNoun = nouns[randomNounIndex];

  // Fetch additional nouns
  const additionalNounsResponse = await fetch("json/nouns-rest.json");
  const additionalNounsData = await additionalNounsResponse.json();
  const additionalNouns = additionalNounsData.words;
  const randomAdditionalNounIndex = Math.floor(
    Math.random() * additionalNouns.length
  );
  const randomAdditionalNoun = additionalNouns[randomAdditionalNounIndex];

  // Fetch climate nouns
  const climateNounsResponse = await fetch("json/climate.json");
  const climateNounsData = await climateNounsResponse.json();
  const climateNouns = climateNounsData.words;
  const randomClimateNounIndex = Math.floor(
    Math.random() * climateNouns.length
  );
  const randomClimateNoun = climateNouns[randomClimateNounIndex];

  // Fetch adjectives
  const adjectivesResponse = await fetch("json/adjectives.json");
  const adjectivesData = await adjectivesResponse.json();
  const adjectives = adjectivesData.words;
  const randomAdjectiveIndex = Math.floor(Math.random() * adjectives.length);
  const randomAdjective = adjectives[randomAdjectiveIndex];

  // Fetch adverbs
  const adverbsResponse = await fetch("json/adverbs.json");
  const adverbsData = await adverbsResponse.json();
  const adverbs = adverbsData.words;
  const randomAdverbIndex = Math.floor(Math.random() * adverbs.length);
  const randomAdverb = adverbs[randomAdverbIndex];

  // Display random words
  const randomWordsElements = document.getElementsByClassName("random-words");
  if (randomWordsElements.length > 0) {
    randomWordsElements[0].innerHTML = `
			  <tr>
				  <td>${randomVerb.word}</td>
				  <td>${randomVerb.transcription}</td>
				  <td>${randomVerb.translation}</td>
			  </tr>
		  `;
  }

  if (randomWordsElements.length > 1) {
    randomWordsElements[1].innerHTML = `
			  <tr>
				  <td>${randomNoun.word}</td>
				  <td>${randomNoun.transcription}</td>
				  <td>${randomNoun.translation}</td>
			  </tr>
		  `;
  }

  if (randomWordsElements.length > 2) {
    randomWordsElements[2].innerHTML = `
			  <tr>
				  <td>${randomAdditionalNoun.word}</td>
				  <td>${randomAdditionalNoun.transcription}</td>
				  <td>${randomAdditionalNoun.translation}</td>
			  </tr>
		  `;
  }

  if (randomWordsElements.length > 3) {
    randomWordsElements[3].innerHTML = `
			  <tr>
				  <td>${randomClimateNoun.word}</td>
				  <td>${randomClimateNoun.transcription}</td>
				  <td>${randomClimateNoun.translation}</td>
			  </tr>
		  `;
  }

  if (randomWordsElements.length > 4) {
    randomWordsElements[4].innerHTML = `
			  <tr>
				  <td>${randomAdjective.word}</td>
				  <td>${randomAdjective.transcription}</td>
				  <td>${randomAdjective.translation}</td>
			  </tr>
		  `;
  }

  if (randomWordsElements.length > 5) {
    randomWordsElements[5].innerHTML = `
			  <tr>
				  <td>${randomAdverb.word}</td>
				  <td>${randomAdverb.transcription}</td>
				  <td>${randomAdverb.translation}</td>
			  </tr>
		  `;
  }
}

window.onload = fetchRandomWords;
