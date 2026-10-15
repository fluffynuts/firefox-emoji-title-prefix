(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EmojiFavicon = Object.assign(root.EmojiFavicon || {}, api);
  }
})(globalThis, function () {
  const OVERRIDES_KEY = "overrides";
  const EMOJI_PATTERN = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

  function normalisePattern(raw) {
    const pattern = String(raw ?? "").trim().toLowerCase();
    if (pattern === "" || /[\s/]/.test(pattern)) {
      throw new Error(
        'Enter a host name such as "www.example.com", or a pattern such as "*.example.com".'
      );
    }
    return pattern;
  }

  function patternToRegExp(pattern) {
    const escaped = pattern
      .split("*")
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    return new RegExp(`^${escaped}$`);
  }

  function literalLength(pattern) {
    return pattern.replace(/\*/g, "").length;
  }

  // Exact hosts beat globs; among globs the one with the most literal
  // characters wins, then alphabetical order so the result is deterministic.
  function findOverride(overrides, hostname) {
    const host = hostname.toLowerCase();
    if (Object.hasOwn(overrides, host) && !host.includes("*")) {
      return { pattern: host, emoji: overrides[host] };
    }
    const matching = Object.keys(overrides)
      .filter((pattern) => pattern.includes("*") && patternToRegExp(pattern).test(host))
      .sort((a, b) => literalLength(b) - literalLength(a) || a.localeCompare(b));
    return matching.length === 0
      ? null
      : { pattern: matching[0], emoji: overrides[matching[0]] };
  }

  function titlePrefix(emoji) {
    return `${emoji} `;
  }

  function searchEmoji(entries, query) {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    return entries.filter(({ emoji, keywords }) =>
      tokens.every((token) => keywords.includes(token) || emoji === token)
    );
  }

  function createStore(area) {
    async function all() {
      const stored = await area.get(OVERRIDES_KEY);
      return stored[OVERRIDES_KEY] ?? {};
    }
    async function set(rawPattern, emoji) {
      const pattern = normalisePattern(rawPattern);
      if (!EMOJI_PATTERN.test(emoji)) {
        throw new Error(`"${emoji}" is not an emoji.`);
      }
      const overrides = await all();
      overrides[pattern] = emoji;
      await area.set({ [OVERRIDES_KEY]: overrides });
    }
    async function remove(rawPattern) {
      const pattern = normalisePattern(rawPattern);
      const overrides = await all();
      delete overrides[pattern];
      await area.set({ [OVERRIDES_KEY]: overrides });
    }
    return { all, set, remove };
  }

  return {
    OVERRIDES_KEY,
    normalisePattern,
    findOverride,
    titlePrefix,
    searchEmoji,
    createStore
  };
});
