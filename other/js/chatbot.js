const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const chatWindow = document.getElementById('chatWindow');

function formatMessage(text) {
    // 1. Sanitize (basic) - mimic textContent behavior first
    let safeText = text.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // 2. Format Bold (**text**)
    safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 3. Format Bullet Points (* item)
    safeText = safeText.replace(/^\* (.*$)/gm, '• $1');

    // 4. Line Breaks
    return safeText.replace(/\n/g, '<br>');
}

function addMessage(text, isUser) {
    const div = document.createElement('div');
    div.className = `message ${isUser ? 'user-msg' : 'bot-msg'}`;

    // User messages are plain text, Bot messages get formatting
    if (isUser) {
        div.textContent = text;
    } else {
        div.innerHTML = formatMessage(text);
    }

    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = userInput.value.trim();
        if (!text) return;

        addMessage(text, true);
        userInput.value = '';

        try {
            const response = await fetch('http://localhost:8000/chatbot/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await response.json();
            addMessage(data.response, false);
        } catch (err) {
            addMessage("Sorry, I'm having trouble connecting to the server.", false);
            console.error(err);
        }
    });
}
