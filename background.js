// Constants
const API_BASE_URL = "https://linkboard.dev";
const BOOKMARK_API_ENDPOINT = `${API_BASE_URL}/api/bookmarks`;
const LOGIN_PAGE_URL = `${API_BASE_URL}/?unauthorized=true`;

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
  try {
    const pageDetails = await getPageDetails(tab);

    const response = await fetch(BOOKMARK_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pageDetails),
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = `HTTP error! status: ${response.status}`;

      if (response.status === 401 && errorData.error === "LINKBOARD_ERROR_NOT_AUTHENTICATED") {
        await showLoginNotification();
        await chrome.tabs.update(tab.id, { url: LOGIN_PAGE_URL });
        return;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    await showNotification("Bookmark Added", "Bookmark added successfully");
  } catch (error) {
    console.error("Error adding bookmark:", error);
    await showNotification("Error", `Error: ${error.message}`);
  }
}

// Function to get page details including OG image and favicon
function getPageDetails(tab) {
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        function: () => {
          const ogImage = document.querySelector('meta[property="og:image"]')?.content || "";
          const favicon = document.querySelector('link[rel*="icon"]')?.href || "";
          return { ogImage, favicon };
        },
      },
      (results) => {
        if (chrome.runtime.lastError) {
          console.error("Error getting page details:", chrome.runtime.lastError);
          resolve({ url: tab.url, title: tab.title });
        } else {
          const { ogImage, favicon } = results[0].result;
          resolve({
            url: tab.url,
            title: tab.title,
            ogImage,
            favicon: favicon || tab.favIconUrl,
          });
        }
      }
    );
  });
}

// Function to show notifications
function showNotification(title, message) {
  return new Promise((resolve) => {
    chrome.notifications.create(
      {
        type: "basic",
        iconUrl: "assets/icon128.png",
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
        iconUrl: "assets/icon128.png",
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
