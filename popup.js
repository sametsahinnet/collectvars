document.addEventListener("DOMContentLoaded", function () {
  const resultArea = document.getElementById("resultArea");
  const globalVarsBtn = document.getElementById("globalVarsBtn");
  const externalVarsBtn = document.getElementById("externalVarsBtn");
  const copyBtn = document.getElementById("copyBtn");
  const resetBtn = document.getElementById("resetBtn");
  const searchInput = document.getElementById("searchInput");
  const lastAnalyzedUrlElement = document.getElementById("currentUrl");

  let currentData = { global: {}, scripts: {} };
  let showValues = false;
  let showDangerousOnly = false;
  let excludeCommonJS = true;
  let ignoreMinified = true;
  let denylist = [];
  let currentView = "global";
  let lastAnalyzedUrl = "";

  // Load the denylist
  fetch(chrome.runtime.getURL("list/denylist.txt"))
    .then((response) => response.text())
    .then((text) => {
      denylist = text.split("\n").filter((item) => item.trim() !== "");
    })
    .catch((error) => console.error("Error loading denylist:", error));

  chrome.storage.sync.get(
    ["showValues", "showDangerousOnly", "excludeCommonJS", "ignoreMinified"],
    function (result) {
      showValues = result.showValues || false;
      showDangerousOnly = result.showDangerousOnly || false;
      excludeCommonJS =
        result.excludeCommonJS !== undefined ? result.excludeCommonJS : true;
      ignoreMinified =
        result.ignoreMinified !== undefined ? result.ignoreMinified : true;

      document.getElementById("toggle1").checked = showDangerousOnly;
      document.getElementById("toggle2").checked = excludeCommonJS;
      document.getElementById("toggle3").checked = showValues;
      document.getElementById("toggle4").checked = ignoreMinified;

      updateResultArea(currentData.global, "global");
    }
  );

  fetch(chrome.runtime.getURL("list/watchlist.txt"))
    .then((response) => response.text())
    .then((text) => {
      watchlist = text.split("\n").filter((item) => item.trim() !== "");
    })
    .catch((error) => console.error("Error loading watchlist:", error));

  document.getElementById("toggle1").addEventListener("change", function () {
    showDangerousOnly = this.checked;
    chrome.storage.sync.set({ showDangerousOnly: showDangerousOnly });
    updateResultArea(currentData[currentView], currentView);
  });

  document.getElementById("toggle2").addEventListener("change", function () {
    excludeCommonJS = this.checked;
    chrome.storage.sync.set({ excludeCommonJS: excludeCommonJS });
    updateResultArea(currentData[currentView], currentView);
  });

  document.getElementById("toggle3").addEventListener("change", function () {
    showValues = this.checked;
    chrome.storage.sync.set({ showValues: showValues });
    updateResultArea(currentData[currentView], currentView);
  });

  document.getElementById("toggle4").addEventListener("change", function () {
    ignoreMinified = this.checked;
    chrome.storage.sync.set({ ignoreMinified: ignoreMinified });
    updateResultArea(currentData[currentView], currentView);
  });

  function updateLastAnalyzedUrlDisplay() {
    lastAnalyzedUrlElement.textContent = lastAnalyzedUrl;
    lastAnalyzedUrlElement.title = lastAnalyzedUrl; // Full URL as tooltip
  }

  function collectVars() {
    console.log("Collecting variables");
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        console.log("Active tab found, sending message to content script");
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "collect" },
          function (response) {
            console.log("Response received", response);
            if (chrome.runtime.lastError) {
              console.error(
                "Message error: ",
                chrome.runtime.lastError.message
              );
              const resultArea = document.getElementById("resultArea");

              if (
                chrome.runtime.lastError.message ===
                "Could not establish connection. Receiving end does not exist."
              ) {
                resultArea.innerText =
                  "Unable to collect data. Please refresh the page and try again.";
              } else {
                resultArea.innerText =
                  "An error occurred: " + chrome.runtime.lastError.message;
              }
            } else if (response && response.success) {
              currentData = response.data;
              lastAnalyzedUrl = tabs[0].url;
              updateLastAnalyzedUrlDisplay();

              console.log("Data received:", currentData);
              Promise.all([waitForWatchlist(), waitForDenylist()]).then(() => {
                updateResultArea(currentData.global, "global");
                globalVarsBtn.classList.add("active");
                externalVarsBtn.classList.remove("active");

                // Check for risky variables in external scripts
                const hasRiskyExternals = Object.values(
                  currentData.scripts
                ).some((scriptVars) =>
                  Object.keys(scriptVars).some((key) => isRisky(key))
                );
                document.getElementById("externalRedDot").style.display =
                  hasRiskyExternals ? "inline-block" : "none";
              });
            } else {
              console.error("Invalid response received", response);
              alert(
                "Invalid response received. Make sure the content script is injected properly."
              );
            }
          }
        );
      } else {
        console.error("No active tab found");
        alert("No active tab found.");
      }
    });
  }

  // Add this helper function to wait for the denylist to load
  function waitForDenylist() {
    return new Promise((resolve) => {
      function checkDenylist() {
        if (denylist.length > 0) {
          resolve();
        } else {
          setTimeout(checkDenylist, 100);
        }
      }
      checkDenylist();
    });
  }

  // Helper function to wait for watchlist to load
  function waitForWatchlist() {
    return new Promise((resolve) => {
      function checkWatchlist() {
        if (watchlist.length > 0) {
          resolve();
        } else {
          setTimeout(checkWatchlist, 100);
        }
      }
      checkWatchlist();
    });
  }

  function highlightDomain(url) {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    return url.replace(
      domain,
      `<span class="domain-highlight">${domain}</span>`
    );
  }

  function stringifyValue(value) {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "function") return "function() { ... }";
    if (Array.isArray(value))
      return `[${value.map(stringifyValue).join(", ")}]`;
    if (typeof value === "object") {
      try {
        return JSON.stringify(
          value,
          (key, val) => {
            if (typeof val === "function") return "function() { ... }";
            if (typeof val === "object" && val !== null) {
              if (val.constructor !== Object && val.constructor !== Array) {
                return `[object ${val.constructor.name}]`;
              }
            }
            return val;
          },
          2
        );
      } catch (error) {
        return "[Circular]";
      }
    }
    return String(value);
  }

  function createDetailsElement(key, value, isUrl = false) {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = key;
    details.appendChild(summary);

    if (value !== undefined) {
      const content = document.createElement("pre");
      content.textContent =
        typeof value === "object" ? JSON.stringify(value, null, 2) : value;
      details.appendChild(content);
    }

    if (isUrl) {
      summary.innerHTML = highlightDomain(key);
    }

    return details;
  }

  function isRisky(key) {
    return watchlist.some((pattern) => {
      if (pattern.startsWith("^") && pattern.endsWith("$")) {
        return new RegExp(pattern).test(key);
      }
      return key.toUpperCase().includes(pattern.toUpperCase());
    });
  }

  function isCommonJS(key) {
    // Add logic to identify common JS libraries
    const commonPatterns = ["ga", "gtag", "fbq", "twq", "pintrk"];
    return commonPatterns.some((pattern) =>
      key.toLowerCase().includes(pattern)
    );
  }

  function updateResultArea(data, type) {
    console.log("Updating result area with data:", data);
    resultArea.innerHTML = "";
    let hasRiskyVars = false;

    function shouldDisplayVar(key) {
      if (showDangerousOnly && !isRisky(key)) return false;
      if (excludeCommonJS && isCommonJS(key)) return false;
      if (ignoreMinified && key.length <= 2) return false;
      return true;
    }

    switch (type) {
      case "global":
        console.log("Current page variables:", data);
        for (const [key, value] of Object.entries(data)) {
          if (!shouldDisplayVar(key)) continue;

          const element = document.createElement("div");
          if (showValues) {
            element.textContent = `${key}=${stringifyValue(value)}`;
          } else {
            element.appendChild(createDetailsElement(key, value));
          }
          if (isRisky(key)) {
            element.classList.add("risky");
            hasRiskyVars = true;
          }
          resultArea.appendChild(element);
        }
        document.getElementById("globalRedDot").style.display = hasRiskyVars
          ? "inline-block"
          : "none";
        break;

      case "scripts":
        for (const [src, vars] of Object.entries(data)) {
          if (
            excludeCommonJS &&
            denylist.length > 0 &&
            denylist.some((domain) => src.includes(domain))
          )
            continue;

          const scriptDetails = createDetailsElement(src, "", true);
          let hasVisibleVars = false;
          let scriptHasRiskyVars = false;

          for (const [key, value] of Object.entries(vars)) {
            if (!shouldDisplayVar(key)) continue;

            hasVisibleVars = true;
            const varElement = document.createElement("div");
            if (showValues) {
              varElement.textContent = `${key}=${stringifyValue(value)}`;
            } else {
              varElement.appendChild(createDetailsElement(key, value));
            }
            if (isRisky(key)) {
              varElement.classList.add("risky");
              scriptHasRiskyVars = true;
            }
            scriptDetails.appendChild(varElement);
          }

          if (hasVisibleVars) {
            resultArea.appendChild(scriptDetails);
            if (scriptHasRiskyVars) hasRiskyVars = true;
          }
        }
        document.getElementById("externalRedDot").style.display = hasRiskyVars
          ? "inline-block"
          : "none";
        break;
    }

    updateLastAnalyzedUrlDisplay();
  }

  globalVarsBtn.addEventListener("click", function () {
    currentView = "global";
    updateResultArea(currentData.global, "global");
    this.classList.add("active");
    externalVarsBtn.classList.remove("active");
  });

  externalVarsBtn.addEventListener("click", function () {
    currentView = "scripts";
    updateResultArea(currentData.scripts, "scripts");
    this.classList.add("active");
    globalVarsBtn.classList.remove("active");
  });

  copyBtn.addEventListener("click", function () {
    const text = resultArea.innerText;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Content copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  });

  resetBtn.addEventListener("click", function () {
    resultArea.innerHTML = "";
    currentData = { global: {}, scripts: {} };
    lastAnalyzedUrl = "";
    updateLastAnalyzedUrlDisplay();

    globalVarsBtn.classList.remove("active");
    externalVarsBtn.classList.remove("active");
  });

  searchInput.addEventListener("input", function () {
    const searchTerm = this.value.toLowerCase();
    const allDetails = resultArea.querySelectorAll("details");
    allDetails.forEach((detail) => {
      const shouldShow = detail.textContent.toLowerCase().includes(searchTerm);
      detail.style.display = shouldShow ? "" : "none";
    });
  });

  // Initial collection when popup opens
  collectVars();
});
