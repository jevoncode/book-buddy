
chrome.storage.session.get('lastWord', ({ lastWord }) => {
  updateDefinition(lastWord);
});

chrome.storage.session.onChanged.addListener((changes) => {
  const lastWordChange = changes['lastWord'];

  if (!lastWordChange) {
    return;
  }

  updateDefinition(lastWordChange.newValue);
});

function updateDefinition(word) {
  if (!word) return;

  // Hide instructions.
  document.body.querySelector('#instruction-text').style.display = 'none';

  // Show word and definition.
  document.body.querySelector('#word-title').innerText = word;
  
  // Prepare the request payload with system instruction
  useStreaming = true
  const payload = {
    model: "llama3",
    messages: [
      {
        role: "system",
        content: "You are a dictionary. Provide the definition, pronunciation, usage, and any relevant information for the word provided."
      },
      {
        role: "user",
        content: word
      }
    ],
    "stream": useStreaming
  };

 // Choose the appropriate function based on useStreaming
 const fetchFunction = useStreaming ? fetchDefinitionStreaming : fetchDefinitionNonStreaming;

 // Fetch the definition using the selected function
 fetchFunction(word, payload)
   .catch(error => {
     console.error('Error:', error);
     document.body.querySelector('#word-definition').innerText = 'Error fetching the definition.';
   });
}

function fetchDefinitionStreaming(word, payload) {
  return fetch('http://192.168.0.115:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let contentCache = '';

      return reader.read().then(function processText({ done, value }) {
        if (done) {
          // Handle final part of the response
          if (accumulatedText) {
            try {
              const finalData = JSON.parse(accumulatedText);
              if (finalData.done) {
                contentCache += finalData.message.content;
                document.body.querySelector('#word-definition').innerHTML = marked.parse(contentCache);
              }
            } catch (e) {
              console.error('Failed to parse final JSON:', e);
              document.body.querySelector('#word-definition').innerText = 'Error parsing final response.';
            }
          }
          return;
        }

        // Decode and accumulate text
        accumulatedText += decoder.decode(value, { stream: true });

        // Process each chunk
        try {
          const json = JSON.parse(accumulatedText);
          if (json.message && json.message.role === "assistant") {
            // Append the content to existing content
            contentCache += json.message.content;
            document.body.querySelector('#word-definition').innerHTML = marked.parse(contentCache);
            // Clear accumulated text to prepare for the next chunk
            accumulatedText = '';
          }
        } catch (e) {
          // Handle incomplete JSON
        }

        return reader.read().then(processText);
      });
    });
}


function fetchDefinitionNonStreaming(word, payload) {
  return fetch('http://192.168.0.115:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(response => response.json())
    .then(data => {
      if (data.message && data.message.role === "assistant") {
        const markdownContent = data.message.content;
        const htmlContent = marked.parse(markdownContent);
        document.body.querySelector('#word-definition').innerHTML = htmlContent;
      } else {
        document.body.querySelector('#word-definition').innerText =
          `Unknown word! Supported words: ${Object.keys(words).join(', ')}`;
      }
    });
}
