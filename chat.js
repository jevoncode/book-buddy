document.getElementById('send-button').addEventListener('click', sendMessage);
document.getElementById('user-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});


function sendMessage() {
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    if (message === '') return;

    addMessage('user', message);
    userInput.value = '';

    // Add the user message to the chat history
    chatHistory.push({ role: 'user', content: message });

    // Prepare the request payload for the Ollama chat API
    const payload = {
        model: 'llama3', // Replace with your model name
        messages: chatHistory,
        stream: useStreaming
    };

    // Choose the appropriate method based on the streaming toggle
    if (useStreaming) {
        handleStreamingResponse(payload);
    } else {
        handleNonStreamingResponse(payload);
    }
}

function handleStreamingResponse(payload) {
    fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let responseText = '';

        return reader.read().then(function processText({ done, value }) {
            if (done) {
                // Finalize response processing
                addMessage('bot', responseText, true);
                chatHistory.push({ role: 'assistant', content: responseText });
                return;
            }

            // Decode and parse JSON
            const chunk = decoder.decode(value, { stream: true });
            const chunkLines = chunk.split('\n').filter(line => line.trim() !== '');

            chunkLines.forEach(line => {
                try {
                    const data = JSON.parse(line);
                    if (data.message && data.message.content) {
                        responseText += data.message.content;
                        addMessage('bot', responseText, true);
                    }
                } catch (e) {
                    console.error('Error parsing JSON chunk:', e);
                }
            });

            // Continue processing
            return reader.read().then(processText);
        });
    })
    .catch(error => {
        console.error('Error:', error);
        addMessage('bot', 'Sorry, something went wrong.');
    });
}

function handleNonStreamingResponse(payload) {
    fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message && data.message.content) {
            // Add the assistant's response to the chat history
            chatHistory.push({ role: 'assistant', content: data.message.content });
            addMessage('bot', data.message.content);
        } else {
            addMessage('bot', 'Sorry, I didn\'t understand that.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        addMessage('bot', 'Sorry, something went wrong.');
    });
}

function addMessage(sender, text, isStreaming = false) {
    const chatBox = document.getElementById('chat-box');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}`;
    if (isStreaming) {
        // For streaming, just append new content to the existing element
        let existingElement = chatBox.querySelector(`.message.${sender}`);
        if (!existingElement) {
            existingElement = document.createElement('div');
            existingElement.className = `message ${sender}`;
            chatBox.appendChild(existingElement);
        }
        existingElement.innerHTML = marked.parse(text);
    } else {
        // For non-streaming, create a new message element
        messageElement.innerHTML = marked.parse(text);
        chatBox.appendChild(messageElement);
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}
