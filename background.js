let watchlist = [];
fetch(chrome.runtime.getURL("list/watchlist.txt"))
  .then((response) => response.text())
  .then((text) => {
    watchlist = text.split("\n").filter((item) => item.trim() !== "");
  });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateBadge") {
    chrome.action.setBadgeText({ text: request.count.toString() });

    if (request.hasRiskyVars) {
      chrome.action.setBadgeBackgroundColor({ color: "#FF0000" }); // Red
      chrome.action.setBadgeTextColor({ color: "#FFFFFF" }); // White text
    } else {
      chrome.action.setBadgeBackgroundColor({ color: "#E0E0E0" }); // Light grey
      chrome.action.setBadgeTextColor({ color: "#000000" }); // Black text
    }
  }
});
