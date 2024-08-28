console.log("Content script loaded");

let collectedData = null;
let watchlist = [];
let denylist = [];

Promise.all([
  fetch(chrome.runtime.getURL("list/watchlist.txt")),
  fetch(chrome.runtime.getURL("list/denylist.txt")),
])
  .then(([watchlistResponse, denylistResponse]) =>
    Promise.all([watchlistResponse.text(), denylistResponse.text()])
  )
  .then(([watchlistText, denylistText]) => {
    watchlist = watchlistText.split("\n").filter((item) => item.trim() !== "");
    denylist = denylistText.split("\n").filter((item) => item.trim() !== "");
  });

function checkForRiskyVars(data) {
  function isRisky(key) {
    return watchlist.some((pattern) => {
      if (pattern.startsWith("^") && pattern.endsWith("$")) {
        return new RegExp(pattern).test(key);
      }
      return key.toUpperCase().includes(pattern.toUpperCase());
    });
  }

  // Check global variables
  for (const key in data.global) {
    if (isRisky(key)) {
      return true;
    }
  }

  // Check external script variables
  for (const scriptVars of Object.values(data.scripts)) {
    for (const key in scriptVars) {
      if (isRisky(key)) {
        return true;
      }
    }
  }

  return false;
}

function injectScript() {
  return new Promise((resolve) => {
    console.log("Injecting script");
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("injected.js");
    script.onload = () => {
      console.log("Script injected");
      script.remove();
    };
    (document.head || document.documentElement).appendChild(script);

    window.addEventListener(
      "message",
      function (event) {
        if (event.data.type && event.data.type === "FROM_PAGE_SCRIPT") {
          console.log("Received message from injected script");
          const data = JSON.parse(event.data.text);

          // Filter out denylisted domains from scripts
          if (
            chrome.storage.sync.get(["excludeCommonJS"], function (result) {
              if (result.excludeCommonJS) {
                data.scripts = Object.fromEntries(
                  Object.entries(data.scripts).filter(
                    ([url]) => !denylist.some((domain) => url.includes(domain))
                  )
                );
              }
              resolve(JSON.stringify(data));
            })
          );
        }
      },
      { once: true }
    );
  });
}

injectScript().then((variables) => {
  collectedData = JSON.parse(variables);
  const globalVarCount = Object.keys(collectedData.global).length;
  const hasRiskyVars = checkForRiskyVars(collectedData);
  console.log(
    "Initial injection complete, global var count:",
    globalVarCount,
    "hasRiskyVars:",
    hasRiskyVars
  );
  chrome.runtime.sendMessage({
    action: "updateBadge",
    count: globalVarCount,
    hasRiskyVars,
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in content script:", request);
  if (request.action === "collect") {
    console.log("Collect action received");
    if (collectedData) {
      console.log("Sending cached data");
      const hasRiskyVars = checkForRiskyVars(collectedData);
      sendResponse({ success: true, data: collectedData, hasRiskyVars });
    } else {
      injectScript().then((variables) => {
        console.log("Variables collected:", variables);
        collectedData = JSON.parse(variables);
        const hasRiskyVars = checkForRiskyVars(collectedData);
        sendResponse({ success: true, data: collectedData, hasRiskyVars });
      });
    }
    return true;
  }
});
