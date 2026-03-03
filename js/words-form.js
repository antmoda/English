// ⚠️ ЗАМІНИ НА СВІЙ URL З RENDER!
const API_URL = 'https://my-ai-backend-2yo5.onrender.com';

document.getElementById("textForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const userInput = document.getElementById("userInput").value.trim();

    if (userInput === "") {
        alert("Please enter a sentence.");
        return;
    }

    // --- Save to file (as before) ---
    let existingText = localStorage.getItem("savedText") || "";
    const currentDate = new Date().toLocaleString("uk-UA");
    const newText = `${existingText}\n\nDate saved: ${currentDate}\n${userInput}`;
    localStorage.setItem("savedText", newText);

    const blob = new Blob([newText], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "my_sentences.txt";
    link.click();

    // --- Check with AI ---
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "<p class='loading'>🔍 Analyzing sentence...</p>";

    try {
        const response = await fetch(`${API_URL}/check`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: userInput })
        });

        const data = await response.json();
        
        // Show result
        resultDiv.innerHTML = formatResult(userInput, data);

    } catch (error) {
        resultDiv.innerHTML = `<p class="error">❌ Connection error: ${error.message}. Make sure backend is running on Render.</p>`;
    }
});

function formatResult(originalText, data) {
    // Make sure all fields exist
    const score = data.score || 5;
    const level = data.level || 'A2';
    const mistakes = data.mistakes || [];
    const corrected = data.corrected || originalText;
    const explanation = data.explanation || '';

    let html = `
        <div class="result-card">
            <h3>📊 Result</h3>
            <p><strong>Your sentence:</strong> ${escapeHtml(originalText)}</p>
            
            <div class="score-container">
                <p><strong>Score:</strong> <span class="score">${score}/10</span></p>
                <p><strong>Level:</strong> <span class="level">${level}</span></p>
            </div>
    `;
    
    // Mistakes
    if (mistakes.length > 0 && mistakes[0] !== "No mistakes found! Perfect!") {
        html += `<div class="mistakes"><p><strong>❌ Mistakes:</strong></p><ul>`;
        mistakes.forEach(m => {
            if (m && m !== "No mistakes found! Perfect!") {
                html += `<li>${escapeHtml(m)}</li>`;
            }
        });
        html += `</ul></div>`;
    } else {
        html += `<p class="perfect">✅ Perfect! No mistakes found.</p>`;
    }
    
    // Corrected version
    if (corrected && corrected !== originalText) {
        html += `
            <div class="corrected">
                <p><strong>✅ Corrected version:</strong></p>
                <p class="corrected-text">${escapeHtml(corrected)}</p>
            </div>
        `;
    }
    
    // Explanation
    if (explanation) {
        html += `
            <div class="explanation">
                <p><strong>📝 Explanation:</strong></p>
                <p>${escapeHtml(explanation).replace(/\n/g, '<br>')}</p>
            </div>
        `;
    }
    
    html += `</div>`;
    return html;
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.replace(/[&<>"']/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return '&#039;';
    });
}
