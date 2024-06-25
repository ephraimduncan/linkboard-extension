chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addBookmark",
    title: "Bookmark This Page",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addBookmark") {
    const bookmark = { url: tab.url, title: tab.title };
    console.log("Received request to add bookmark:", bookmark);

    fetch("http://localhost:3000/api/bookmarks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookmark),
      credentials: "include",
    })
      .then((response) => {
        if (response.status === 401) {
          return response.json().then((data) => {
            if (data.error === "LINKBOARD_ERROR_NOT_AUTHENTICATED") {
              // Perform the redirect to the login page
              chrome.tabs.update(tab.id, { url: "http://localhost:3000/login" });
            }
            return Promise.reject(data);
          });
        }
        return response.json();
      })
      .then((data) => {
        console.log("Response from server:", data);
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon.png",
          title: "Bookmark Added",
          message: "Bookmark added successfully",
        });
      })
      .catch((error) => {
        console.error("Error adding bookmark:", error);
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon.png",
          title: "Error",
          message: "Error: " + (error.message || error.error),
        });
      });
  }
});
