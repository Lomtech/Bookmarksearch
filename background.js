// background.js

// Funktion zum Speichern von Tags in chrome.storage
function saveTags(bookmarkId, newTags) {
  chrome.storage.local.get({ bookmarkTags: {} }, function (data) {
    const bookmarkTags = data.bookmarkTags || {};
    bookmarkTags[bookmarkId] = newTags; // Überschreibt vorhandene Tags
    chrome.storage.local.set({ bookmarkTags: bookmarkTags }, function () {
      console.log("Tags für Lesezeichen gespeichert:", bookmarkId, newTags);
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "generateTags") {
    generateTags(request.bookmarkTitle, request.bookmarkUrl).then((tags) => {
      sendResponse({ tags });
    });
    return true; // Ermöglicht asynchrone Antwort
  }
});

// Funktion zur Generierung von 10 Tags durch deinen Proxy-Server
async function generateTags(bookmarkTitle, bookmarkUrl) {
  const serverUrl = "https://lomtech-apiserver-90.deno.dev/"; // Ersetze durch die URL deines Deno-Proxy-Servers

  try {
    const response = await fetch(serverUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bookmarkTitle, // Titel des Lesezeichens
        bookmarkUrl, // URL des Lesezeichens
      }),
    });

    const data = await response.json();

    // Tags vom Server empfangen und aufteilen
    const tags = data.tags || [];
    return tags;
  } catch (error) {
    console.error(
      "Fehler bei der Tag-Generierung über den Proxy-Server:",
      error
    );
    return [];
  }
}

// Listener, wenn ein neues Lesezeichen erstellt wird
chrome.bookmarks.onCreated.addListener(function (id, bookmark) {
  if (bookmark.url) {
    generateTags(bookmark.title, bookmark.url).then((tags) => {
      saveTags(id, tags); // Tags speichern
    });
  }
});
