// content.js
// console.log("Content script loaded");
console.log("Content script loaded");

chrome.runtime.onMessage.addListener((message) => {
  console.log("Message received in content script: " + JSON.stringify(message));
  //TODO replace selected text 
});
