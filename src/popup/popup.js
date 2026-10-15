(async () => {
  const { createStore, findOverride, normalisePattern, searchEmoji, emojiEntries, emojiGroups } = EmojiFavicon;
  const store = createStore(browser.storage.local);

  const patternInput = document.getElementById("pattern");
  const searchInput = document.getElementById("search");
  const grid = document.getElementById("grid");
  const groupBar = document.getElementById("groups");
  const preview = document.getElementById("preview");
  const current = document.getElementById("current");
  const removeButton = document.getElementById("remove");
  const status = document.getElementById("status");

  let overrides = {};
  let activeGroup = emojiGroups[0];

  function say(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  function selectedPattern() {
    try {
      return normalisePattern(patternInput.value);
    } catch (error) {
      say(error.message, true);
      return null;
    }
  }

  function refreshCurrent() {
    const pattern = selectedPattern();
    if (pattern !== null) say("");
    const emoji = pattern === null ? undefined : overrides[pattern];
    current.textContent = emoji ?? "none";
    removeButton.disabled = emoji === undefined;
  }

  function renderGroups() {
    groupBar.classList.toggle("searching", searchInput.value.trim() !== "");
    groupBar.replaceChildren(
      ...emojiGroups.map((group) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = group.icon;
        button.title = group.label;
        button.classList.toggle("active", group === activeGroup);
        button.addEventListener("click", () => {
          activeGroup = group;
          searchInput.value = "";
          render();
        });
        return button;
      })
    );
  }

  function renderGrid() {
    const searching = searchInput.value.trim() !== "";
    const entries = searching ? searchEmoji(emojiEntries, searchInput.value) : activeGroup.entries;
    grid.replaceChildren(
      ...entries.map(({ emoji, label }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = emoji;
        button.dataset.emoji = emoji;
        button.dataset.label = label;
        return button;
      })
    );
    grid.scrollTop = 0;
  }

  function render() {
    renderGroups();
    renderGrid();
  }

  function showPreview(event) {
    const button = event.target.closest("button");
    preview.textContent = button ? `${button.dataset.emoji}  ${button.dataset.label}` : "\u00a0";
  }

  async function choose(emoji) {
    const pattern = selectedPattern();
    if (pattern === null) return;
    await store.set(pattern, emoji);
    overrides = await store.all();
    refreshCurrent();
    say(`Saved ${emoji} for ${pattern}`);
  }

  async function remove() {
    const pattern = selectedPattern();
    if (pattern === null) return;
    await store.remove(pattern);
    overrides = await store.all();
    refreshCurrent();
    say(`Removed ${pattern}`);
  }

  async function currentHostname() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url ? new URL(tab.url) : null;
    if (url === null || !["http:", "https:"].includes(url.protocol)) {
      throw new Error("This tab's address can't be read, or isn't an http(s) page. You can still type a host or pattern.");
    }
    return url.hostname;
  }

  overrides = await store.all();
  let hostname = "";
  try {
    hostname = await currentHostname();
  } catch (error) {
    say(error.message, true);
  }
  patternInput.value = (hostname && findOverride(overrides, hostname)?.pattern) || hostname;
  if (hostname) refreshCurrent();

  patternInput.addEventListener("input", refreshCurrent);
  searchInput.addEventListener("input", render);
  grid.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button) choose(button.dataset.emoji).catch((e) => say(e.message, true));
  });
  grid.addEventListener("mouseover", showPreview);
  grid.addEventListener("focusin", showPreview);
  removeButton.addEventListener("click", () => remove().catch((e) => say(e.message, true)));
  document.getElementById("manage").addEventListener("click", (event) => {
    event.preventDefault();
    browser.runtime.openOptionsPage();
    window.close();
  });
  render();
  searchInput.focus();
})().catch((error) => {
  const status = document.getElementById("status");
  status.textContent = `Something went wrong: ${error.message}`;
  status.classList.add("error");
});
