document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('searchInput');
  const resultsContainer = document.getElementById('results');
  const tagSection = document.getElementById('tagSection');
  const tagInput = document.getElementById('tagInput');
  const saveTagButton = document.getElementById('saveTagButton');
  let currentBookmarkId = null;

  // Funktion zur Anzeige von Lesezeichen mit Tags
  function displayBookmarkWithTags(bookmark, tags) {
    const listItem = document.createElement('li');
    const link = document.createElement('a');
    link.href = bookmark.url;
    link.textContent = bookmark.title;
    link.target = '_blank';

    // Tags anzeigen
    const tagsSpan = document.createElement('span');
    tagsSpan.textContent = ` | Tags: ${tags.join(', ')}`;
    tagsSpan.style.marginLeft = '10px';

    // Klick-Event zum Hinzufügen von manuellen Tags
    link.addEventListener('click', function () {
      currentBookmarkId = bookmark.id;
      tagSection.style.display = 'block';
      tagInput.value = ''; // Eingabefeld leeren
    });

    listItem.appendChild(link);
    listItem.appendChild(tagsSpan);
    resultsContainer.appendChild(listItem);
  }

  // Funktion zum Durchsuchen von Lesezeichen nach Titel und Tags
  function searchBookmarks(query) {
    resultsContainer.innerHTML = ''; // Vorherige Ergebnisse leeren
    tagSection.style.display = 'none';

    // Alle Lesezeichen abrufen
    chrome.bookmarks.getTree(function (bookmarkTreeNodes) {
      const allBookmarks = [];
      function processNodes(nodes) {
        nodes.forEach(node => {
          if (node.children) {
            processNodes(node.children);
          } else if (node.url) {
            allBookmarks.push(node);
          }
        });
      }
      processNodes(bookmarkTreeNodes);

      // Gespeicherte Tags abrufen
      chrome.storage.local.get({ bookmarkTags: {} }, function (data) {
        const bookmarkTags = data.bookmarkTags || {};

        // Lesezeichen filtern basierend auf der Suche
        const queryLower = query.toLowerCase();
        const filteredBookmarks = allBookmarks.filter(bookmark => {
          const tags = bookmarkTags[bookmark.id] || [];
          const titleMatch = bookmark.title.toLowerCase().includes(queryLower);
          const tagsMatch = tags.some(tag => tag.toLowerCase().includes(queryLower));
          return titleMatch || tagsMatch;
        });

        if (filteredBookmarks.length > 0) {
          filteredBookmarks.forEach(bookmark => {
            const tags = bookmarkTags[bookmark.id] || [];
            displayBookmarkWithTags(bookmark, tags);
          });
        } else {
          resultsContainer.textContent = 'Keine Favoriten gefunden.';
        }
      });
    });
  }

  // Event-Listener für das Suchfeld
  searchInput.addEventListener('input', function () {
    const query = searchInput.value.trim();
    if (query) {
      searchBookmarks(query);
    } else {
      resultsContainer.innerHTML = ''; // Leeren, wenn kein Text eingegeben wurde
    }
  });

  // Manuell hinzugefügte Tags speichern
  saveTagButton.addEventListener('click', function () {
    const newTags = tagInput.value.trim().split(',').map(tag => tag.trim());
    if (newTags.length > 0 && currentBookmarkId) {
      saveTags(currentBookmarkId, newTags);
      tagSection.style.display = 'none';
    }
  });

  // Funktion zum Speichern von Tags in chrome.storage
  function saveTags(bookmarkId, newTags) {
    chrome.storage.local.get({ bookmarkTags: {} }, function (data) {
      const bookmarkTags = data.bookmarkTags || {};
      const existingTags = bookmarkTags[bookmarkId] || [];
      bookmarkTags[bookmarkId] = [...new Set([...existingTags, ...newTags])]; // Doppelte Tags vermeiden
      chrome.storage.local.set({ bookmarkTags: bookmarkTags }, function () {
        console.log('Tags für Lesezeichen gespeichert:', bookmarkId, bookmarkTags[bookmarkId]);
      });
    });
  }
});