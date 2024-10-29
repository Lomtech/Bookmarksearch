document.addEventListener("DOMContentLoaded", function () {
  const searchInput =
    document.getElementById("searchInput") ||
    console.error("searchInput not found");
  const resultsContainer =
    document.getElementById("results") ||
    console.error("resultsContainer not found");
  const tagSection =
    document.getElementById("tagSection") ||
    console.error("tagSection not found");
  const tagInput =
    document.getElementById("tagInput") || console.error("tagInput not found");
  const saveTagButton =
    document.getElementById("saveTagButton") ||
    console.error("saveTagButton not found");
  let currentBookmarkId = null;

  let queue = []; // Queue für die noch zu verarbeitenden Favoriten
  let allBookmarks = []; // Unveränderte Liste aller Favoriten für die Suche
  let intervalId = null; // Intervall-Id für das sequenzielle Taggen
  let isQueueInitialized = false; // Flag zur Überprüfung, ob die Queue bereits initialisiert wurde
  let processedQueue = []; // Array, um bereits verarbeitete Lesezeichen zu speichern

  // Geladene, bereits verarbeitete Favoriten beim Start aus chrome.storage abrufen
  chrome.storage.local.get({ processedQueue: [] }, function (data) {
    processedQueue = data.processedQueue;
    initializeQueue();
  });

  function initializeQueue() {
    if (isQueueInitialized) return; // Verhindert erneute Initialisierung

    chrome.bookmarks.getTree(function (bookmarkTreeNodes) {
      function processNodes(nodes) {
        nodes.forEach((node) => {
          if (node.children) {
            processNodes(node.children);
          } else if (node.url) {
            allBookmarks.push(node); // Speichert in der unveränderten Favoritenliste
          }
        });
      }
      processNodes(bookmarkTreeNodes);

      // Füllt die Queue mit den neuesten Favoriten zuerst (sortiert nach ID) und entfernt bereits verarbeitete
      queue = allBookmarks
        .filter((bookmark) => !processedQueue.includes(bookmark.id)) // Entferne bereits verarbeitete Lesezeichen
        .sort((a, b) => parseInt(b.id) - parseInt(a.id)); // Sortiere nach ID in absteigender Reihenfolge

      isQueueInitialized = true; // Markiert die Queue als initialisiert
      processQueue(); // Starte die Verarbeitung der Queue
    });
  }

  function processQueue() {
    if (intervalId) return; // Verhindert mehrfaches Starten

    intervalId = setInterval(() => {
      if (queue.length === 0) {
        clearInterval(intervalId); // Stoppe das Intervall, wenn alle Favoriten verarbeitet wurden
        intervalId = null;
        console.log("Alle Favoriten wurden getaggt.");
        return;
      }

      const bookmark = queue.shift(); // Nächsten Favoriten aus der Queue nehmen und entfernen
      tagBookmark(bookmark); // Favorit taggen
    }, 1000); // Zeitabstand zwischen den API-Aufrufen (5 Sekunden)
  }

  function tagBookmark(bookmark) {
    chrome.runtime.sendMessage(
      {
        type: "generateTags",
        bookmarkTitle: bookmark.title,
        bookmarkUrl: bookmark.url,
      },
      function (response) {
        if (response && response.tags) {
          const limitedTags = response.tags.slice(0, 10); // Begrenze die Tags auf 10
          saveTags(bookmark.id, limitedTags);
          console.log(
            `Tags für Favorit "${bookmark.title}" gespeichert:`,
            limitedTags
          );
        } else {
          console.error("Fehler beim Taggen des Favoriten.");
        }
      }
    );
  }

  function saveTags(bookmarkId, newTags) {
    chrome.storage.local.get(
      { bookmarkTags: {}, processedQueue: [] },
      function (data) {
        const bookmarkTags = data.bookmarkTags || {};
        processedQueue = data.processedQueue || []; // Aktualisiere die verarbeitete Queue aus storage
        const existingTags = bookmarkTags[bookmarkId] || [];
        bookmarkTags[bookmarkId] = [...new Set([...existingTags, ...newTags])];

        // Speichere die Tags und die aktualisierte verarbeitete Queue in chrome.storage
        chrome.storage.local.set(
          {
            bookmarkTags: bookmarkTags,
            processedQueue: [...processedQueue, bookmarkId], // Füge das Lesezeichen zur verarbeiteten Queue hinzu
          },
          function () {
            console.log(
              "Tags für Lesezeichen gespeichert:",
              bookmarkId,
              bookmarkTags[bookmarkId]
            );
          }
        );
      }
    );
  }

  // Funktion zum Durchsuchen von Lesezeichen nach Titel und Tags
  function searchBookmarks(query) {
    resultsContainer.innerHTML = ""; // Vorherige Ergebnisse leeren
    tagSection.style.display = "none";

    chrome.storage.local.get({ bookmarkTags: {} }, function (data) {
      const bookmarkTags = data.bookmarkTags || {};

      // Lesezeichen filtern basierend auf der Suche
      const queryLower = query.toLowerCase();
      const filteredBookmarks = allBookmarks.filter((bookmark) => {
        const tags = bookmarkTags[bookmark.id] || [];
        const titleMatch = bookmark.title.toLowerCase().includes(queryLower);
        const tagsMatch = tags.some((tag) =>
          tag.toLowerCase().includes(queryLower)
        );
        return titleMatch || tagsMatch;
      });

      if (filteredBookmarks.length > 0) {
        filteredBookmarks.forEach((bookmark) => {
          const tags = bookmarkTags[bookmark.id] || [];
          displayBookmarkWithTags(bookmark, tags);
        });
      } else {
        resultsContainer.textContent = "Keine Favoriten gefunden.";
      }
    });
  }

  searchInput.addEventListener("input", function () {
    const query = searchInput.value.trim();
    if (query) {
      searchBookmarks(query);
    } else {
      resultsContainer.innerHTML = ""; // Leeren, wenn kein Text eingegeben wurde
    }
  });

  function displayBookmarkWithTags(bookmark, tags) {
    const listItem = document.createElement("li");
    const link = document.createElement("a");
    link.href = bookmark.url;
    link.textContent = bookmark.title;
    link.target = "_blank";

    const tagsSpan = document.createElement("span");
    tagsSpan.textContent = ` | Tags: ${tags.join(", ")}`;
    tagsSpan.style.marginLeft = "10px";

    link.addEventListener("click", function () {
      currentBookmarkId = bookmark.id;
      tagSection.style.display = "block";
      tagInput.value = "";
    });

    listItem.appendChild(link);
    listItem.appendChild(tagsSpan);
    resultsContainer.appendChild(listItem);
  }
});
