(() => {
  const { OVERRIDES_KEY, findOverride, titlePrefix } = EmojiFavicon;

  let prefix = null;
  let observer = null;

  function ensurePrefix() {
    const title = document.title;
    if (!title.startsWith(prefix)) {
      document.title = (prefix + title).trimEnd();
    }
  }

  function removePrefix() {
    if (document.title.startsWith(prefix)) {
      document.title = document.title.slice(prefix.length);
    }
  }

  function isTitleMutation(mutation) {
    const target = mutation.target.nodeType === Node.ELEMENT_NODE
      ? mutation.target
      : mutation.target.parentElement;
    return (
      target?.closest("title") != null ||
      [...mutation.addedNodes].some((node) => ["title", "head"].includes(node.localName))
    );
  }

  // Pages rewrite their titles on navigation and on every unread-count change,
  // so the prefix has to be re-applied each time.
  function watchTitle() {
    observer = new MutationObserver((mutations) => {
      if (mutations.some(isTitleMutation)) {
        ensurePrefix();
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function stopWatching() {
    observer?.disconnect();
    observer = null;
  }

  function apply(overrides) {
    const match = findOverride(overrides, location.hostname);
    stopWatching();
    if (prefix !== null) {
      removePrefix();
      prefix = null;
    }
    if (match === null) {
      return;
    }
    prefix = titlePrefix(match.emoji);
    ensurePrefix();
    watchTitle();
  }

  browser.storage.local.get(OVERRIDES_KEY).then((stored) => apply(stored[OVERRIDES_KEY] ?? {}));
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && OVERRIDES_KEY in changes) {
      apply(changes[OVERRIDES_KEY].newValue ?? {});
    }
  });
})();
