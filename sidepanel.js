let isStopped = false;

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

  addStopButton(); // Add stop button dynamically

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

  document.body.querySelector('#word-definition').innerHTML = "processing...";
  isStopped = false; // Reset stop flag
  const fetchFunction = useStreaming ? fetchDefinitionStreaming : fetchDefinitionNonStreaming;

  fetchFunction(word, payload)
    .then(() => removeStopButton()) // Remove stop button after processing is done
    .catch(error => {
      console.log('Error:', error);
      removeStopButton(); // Remove stop button if there's an error
      document.body.querySelector('#word-definition').innerHTML = marked.parse(`Check if the Configuration for \`apiUrl\` is correct and if the \`Ollama\` service is running.`);
    });
}

function fetchDefinitionStreaming(word, payload) {
  return fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(response => {
      if (response.status == 403 || response.status == 404) {
        document.body.querySelector('#word-definition').innerHTML = marked.parse(`HTTP Error: ${response.status}. Your Ollama service may not be running with the configuration  \`OLLAMA_ORIGINS=chrome-extension://*\` `);
        return;
      }
      if (response.status !== 200) {
        document.body.querySelector('#word-definition').innerHTML = marked.parse(`Oops! Wrong way, HTTP Error: ${response.status} ${response.statusText}`);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let contentCache = '';

      return reader.read().then(function processText({ done, value }) {
        if (isStopped) {
          document.body.querySelector('#word-definition').innerHTML = "Processing stopped.";
          removeStopButton(); // Remove stop button when stopped
          return;
        }
        if (done) {
          contentCache = processAccumulatedText(accumulatedText, contentCache);
          removeStopButton(); // Remove stop button when done
          return;
        }

        accumulatedText = decoder.decode(value, { stream: true });
        contentCache = processAccumulatedText(accumulatedText, contentCache);

        return reader.read().then(processText);
      });
    });
}

function processAccumulatedText(text, cache) {
  let startIndex = 0;
  let endIndex;
  while ((endIndex = text.indexOf('\n', startIndex)) !== -1) {
    const jsonStr = text.slice(startIndex, endIndex).trim();
    startIndex = endIndex + 1;
    if (jsonStr) {
      try {
        const json = JSON.parse(jsonStr);
        if (json.message && json.message.role === "assistant") {
          cache += json.message.content;
          document.querySelector('#word-definition').innerHTML = marked.parse(cache);
        }
      } catch (e) {
        console.log('Failed to parse JSON:', e);
      }
    }
  }
  return cache;
}


function fetchDefinitionNonStreaming(word, payload) {
  return fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(response => response.json())
    .then(data => {
      if (isStopped) {
        document.body.querySelector('#word-definition').innerHTML = "Processing stopped.";
        removeStopButton(); // Remove stop button when stopped
        return;
      }
      if (data.message && data.message.role === "assistant") {
        const markdownContent = data.message.content;
        const htmlContent = marked.parse(markdownContent);
        document.body.querySelector('#word-definition').innerHTML = htmlContent;
      } else {
        document.body.querySelector('#word-definition').innerText =
          `Unknown word! Supported words: ${Object.keys(words).join(', ')}`;
      }
      removeStopButton(); // Remove stop button when done
    });
}

// Function to stop the processing
function stopProcessing() {
  isStopped = true;
  document.body.querySelector('#word-definition').innerHTML = "Processing stopped.";
  removeStopButton(); // Remove stop button when stopped
}

// Function to add stop button dynamically
function addStopButton() {
  let stopButton = document.getElementById('stop-button');
  if (!stopButton) {
    stopButton = document.createElement('button');
    stopButton.id = 'stop-button';
    stopButton.innerText = 'Stop';
    stopButton.addEventListener('click', stopProcessing);
    document.getElementById('stop-content').appendChild(stopButton);
  }
}

// Function to remove stop button
function removeStopButton() {
  chrome.storage.session.set({ lastWord: '' });
  let stopButton = document.getElementById('stop-button');
  if (stopButton) {
    stopButton.remove();
  }
}
