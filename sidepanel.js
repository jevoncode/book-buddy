chrome.storage.session.get('lastWord', ({ lastWord }) => {
  loadConfiguration().then(() => updateDefinition(lastWord));
});

chrome.storage.session.onChanged.addListener((changes) => {
  const lastWordChange = changes['lastWord'];

  if (!lastWordChange) {
    return;
  }

  loadConfiguration().then(() => updateDefinition(lastWordChange.newValue));
});

let apiUrl = 'http://localhost:11434/api/chat';
let useStreaming = true;

function loadConfiguration() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiUrl', 'useStreaming'], function(result) {
      if (result.apiUrl) {
        apiUrl = result.apiUrl;
      }
      if (result.useStreaming !== undefined) {
        useStreaming = result.useStreaming;
      }
      resolve();
    });
  });
}

function updateDefinition(word) {
  if (!word) return;

  document.body.querySelector('#instruction-text').style.display = 'none';
  document.body.querySelector('#word-title').innerText = word;

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

  const fetchFunction = useStreaming ? fetchDefinitionStreaming : fetchDefinitionNonStreaming;

  fetchFunction(word, payload)
    .catch(error => {
      console.log('Error:', error);
      document.body.querySelector('#word-definition').innerText = 'Error fetching the definition. Please check the service, network, or cors problems';
    });
}

function fetchDefinitionStreaming(word, payload) {
  return fetch(apiUrl, {
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
          if (accumulatedText) {
            try {
              const finalData = JSON.parse(accumulatedText);
              if (finalData.done) {
                contentCache += finalData.message.content;
                document.body.querySelector('#word-definition').innerHTML = marked.parse(contentCache);
              }
            } catch (e) {
              console.log('Failed to parse final JSON:', e);
              document.body.querySelector('#word-definition').innerText = 'Error parsing final response.';
            }
          }
          return;
        }

        accumulatedText += decoder.decode(value, { stream: true });

        try {
          const json = JSON.parse(accumulatedText);
          if (json.message && json.message.role === "assistant") {
            contentCache += json.message.content;
            document.body.querySelector('#word-definition').innerHTML = marked.parse(contentCache);
            accumulatedText = '';
          }
        } catch (e) {
        }

        return reader.read().then(processText);
      });
    });
}

function fetchDefinitionNonStreaming(word, payload) {
  return fetch(apiUrl, {
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
