// background.js

// Funktion zum Speichern von Tags in chrome.storage
function saveTags(bookmarkId, newTags) {
  chrome.storage.local.get({ bookmarkTags: {} }, function (data) {
    const bookmarkTags = data.bookmarkTags || {};
    bookmarkTags[bookmarkId] = newTags; // Überschreibt vorhandene Tags
    chrome.storage.local.set({ bookmarkTags: bookmarkTags }, function () {
      console.log('Tags für Lesezeichen gespeichert:', bookmarkId, newTags);
    });
  });
}

// Funktion zur Generierung von 10 Tags durch GPT-3.5-Turbo
async function generateTags(bookmarkTitle, bookmarkUrl) {
  const API_KEY = 'YOUR API KEY'; // Ersetze durch deinen OpenAI API-Schlüssel
  const prompt = `Generate 10 relevant keywords or tags based on this bookmark title and URL:\nTitle: "${bookmarkTitle}"\nURL: ${bookmarkUrl}`;
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant that generates keywords or tags based on the given title and URL." },
          { role: "user", content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    
    // Inhalt extrahieren und in Tags aufteilen
    const content = data.choices[0].message.content.trim();
    const tags = content.split(',').map(tag => tag.trim()).slice(0, 10); // Nimmt nur die ersten 10 Tags
    return tags;
  } catch (error) {
    console.error('Fehler bei der GPT-Abfrage:', error);
    return [];
  }
}

// Listener, wenn ein neues Lesezeichen erstellt wird
chrome.bookmarks.onCreated.addListener(function (id, bookmark) {
  if (bookmark.url) {
    generateTags(bookmark.title, bookmark.url).then(tags => {
      saveTags(id, tags); // Tags speichern
    });
  }
});
