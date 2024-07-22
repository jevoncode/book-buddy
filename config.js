document.addEventListener('DOMContentLoaded', function() {
    const apiUrlInput = document.getElementById('api-url');
    const useStreamingInput = document.getElementById('use-streaming');
    const saveButton = document.getElementById('save-button');

    // Load saved settings
    chrome.storage.local.get(['apiUrl', 'useStreaming'], function(result) {
        if (result.apiUrl) {
            apiUrlInput.value = result.apiUrl;
        } else {
            apiUrlInput.value = 'http://localhost:11434/api/chat';
        }
        if (result.useStreaming !== undefined) {
            useStreamingInput.checked = result.useStreaming;
        } else {
            useStreamingInput.checked = true
        }
    });

    // Save settings
    saveButton.addEventListener('click', function() {
        const apiUrl = apiUrlInput.value;
        const useStreaming = useStreamingInput.checked;

        chrome.storage.local.set({ apiUrl, useStreaming }, function() {
            window.location.href = 'sidepanel.html';  // Go forward to a page
        });
    });
});
