(function () {
  if (window.collectAllVariablesExecuted) return;
  window.collectAllVariablesExecuted = true;

  function collectAllVariables() {
    const allVariables = {
      global: {},
      scripts: {},
    };

    function getCustomProperties(obj) {
      return Object.keys(obj).filter(
        (x) =>
          x !== "collectAllVariablesExecuted" && // Add this line to exclude the variable
          typeof obj[x] !== "function" &&
          !(obj[x] instanceof Element) &&
          Object.entries(Object.getOwnPropertyDescriptor(obj, x)).filter(
            (e) =>
              ["value", "writable", "enumerable", "configurable"].includes(
                e[0]
              ) && e[1]
          ).length === 4
      );
    }

    function safeStringify(obj, maxDepth = 3, currentDepth = 0) {
      if (currentDepth > maxDepth) return "[Max Depth Reached]";
      if (typeof obj !== "object" || obj === null) return JSON.stringify(obj);
      if (Array.isArray(obj)) {
        return (
          "[" +
          obj
            .map((item) => safeStringify(item, maxDepth, currentDepth + 1))
            .join(", ") +
          "]"
        );
      }
      let result = "{";
      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (result.length > 1) result += ", ";
          result += `"${key}": ${safeStringify(
            obj[key],
            maxDepth,
            currentDepth + 1
          )}`;
        }
      }
      result += "}";
      return result;
    }

    const customGlobalProps = getCustomProperties(window);
    for (let prop of customGlobalProps) {
      try {
        const value = window[prop];
        allVariables.global[prop] = safeStringify(value);
      } catch (error) {
        allVariables.global[prop] = "[inaccessible]";
      }
    }

    function extractVariables(content) {
      const vars = {};
      const regex = /(?:var|let|const)\s+(\w+)\s*=\s*([^;]+)/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        vars[match[1]] = match[2].trim();
      }
      return vars;
    }

    const scripts = document.getElementsByTagName("script");
    const inlineScripts = Array.from(scripts).filter((script) => !script.src);
    inlineScripts.forEach((script, index) => {
      const vars = extractVariables(script.textContent);
      Object.assign(allVariables.global, vars);
    });

    let fetchPromises = [];
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if (
        script.src &&
        (script.src.startsWith("http://") || script.src.startsWith("https://"))
      ) {
        let fetchPromise = fetch(script.src)
          .then((response) => response.text())
          .then((content) => {
            allVariables.scripts[script.src] = extractVariables(content);
          })
          .catch((error) => {
            allVariables.scripts[script.src] = "[fetch error]";
          });
        fetchPromises.push(fetchPromise);
      }
    }

    Promise.all(fetchPromises).then(() => {
      window.postMessage(
        { type: "FROM_PAGE_SCRIPT", text: JSON.stringify(allVariables) },
        "*"
      );
    });
  }

  collectAllVariables();
})();
