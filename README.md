
# Book Buddy

Book Buddy is a Chrome extension with a simple feature: select text and use Ollama to explain it.

## Steps to Install

This extension requires Ollama to be installed first.

1. Clone this project:
```bash
git clone https://github.com/jevoncode/book-buddy.git
```

2. In Chrome, navigate to the extensions management page by typing `chrome://extensions/` in the address bar.

3. Click on `Load unpacked` and select the directory you just cloned.

4. (Optional) In the side panel, you can configure the Ollama API URL. The default is `http://localhost:11434/api/chat`.

You should now see `Book Buddy 0.1` in your extensions. Go to any web page, select the text you want to learn more about or are confused about, and use the extension to get an explanation.

# Additional Configuration

## Handling 403 Forbidden Errors from Ollama

To avoid 403 Forbidden errors, run Ollama with the following environment variable:
```bash
OLLAMA_ORIGINS=chrome-extension://* ollama serve
```