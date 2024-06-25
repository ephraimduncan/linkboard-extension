// Constants
const API_BASE_URL = "https://linkboard.dev";
const BOOKMARK_API_ENDPOINT = `${API_BASE_URL}/api/bookmarks`;
const LOGIN_PAGE_URL = `${API_BASE_URL}/login`;

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addBookmark",
    title: "Save for Later (Private)",
    contexts: ["page"],
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addBookmark") {
    addBookmark(tab);
  }
});

// Function to add bookmark
async function addBookmark(tab) {
  const bookmark = { url: tab.url, title: tab.title };
  console.log("Received request to add bookmark:", bookmark);

  try {
    const response = await fetch(BOOKMARK_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookmark),
      credentials: "include",
    });

    if (response.status === 401) {
      const data = await response.json();
      if (data.error === "LINKBOARD_ERROR_NOT_AUTHENTICATED") {
        await showLoginNotification();
        await chrome.tabs.update(tab.id, { url: LOGIN_PAGE_URL });
        return;
      }
      throw new Error(data.error || "Unauthorized");
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Response from server:", data);
    await showNotification("Bookmark Added", "Bookmark added successfully");
  } catch (error) {
    console.error("Error adding bookmark:", error);
    await showNotification("Error", `Error: ${error.message}`);
  }
}

// Function to show notifications
function showNotification(title, message) {
  return new Promise((resolve) => {
    chrome.notifications.create(
      {
        type: "basic",
        iconUrl: "icon.png",
        title,
        message,
      },
      resolve
    );
  });
}

// Function to show login notification
function showLoginNotification() {
  return new Promise((resolve) => {
    chrome.notifications.create(
      {
        type: "basic",
        iconUrl: "icon.png",
        title: "Login Required",
        message: "You need to log in to add bookmarks. Redirecting to login page...",
      },
      (notificationId) => {
        // Wait for 3 seconds before resolving to give user time to read the notification
        setTimeout(() => {
          chrome.notifications.clear(notificationId, resolve);
        }, 3000);
      }
    );
  });
}
