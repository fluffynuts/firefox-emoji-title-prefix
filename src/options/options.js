(() => {
  const { OVERRIDES_KEY, createStore } = EmojiFavicon;
  const store = createStore(browser.storage.local);
  const list = document.getElementById("list");
  const empty = document.getElementById("empty");
  const error = document.getElementById("error");

  function fail(e) {
    error.textContent = `Something went wrong: ${e.message}`;
  }

  function row(pattern, emoji) {
    const item = document.createElement("li");
    const emojiSpan = Object.assign(document.createElement("span"), { className: "emoji", textContent: emoji });
    const patternSpan = Object.assign(document.createElement("span"), { className: "pattern", textContent: pattern });
    const button = Object.assign(document.createElement("button"), { type: "button", textContent: "Remove" });
    button.addEventListener("click", () => store.remove(pattern).catch(fail));
    item.append(emojiSpan, patternSpan, button);
    return item;
  }

  function render(overrides) {
    const patterns = Object.keys(overrides).sort();
    list.replaceChildren(...patterns.map((pattern) => row(pattern, overrides[pattern])));
    empty.hidden = patterns.length > 0;
  }

  store.all().then(render).catch(fail);
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && OVERRIDES_KEY in changes) {
      render(changes[OVERRIDES_KEY].newValue ?? {});
    }
  });
})();
