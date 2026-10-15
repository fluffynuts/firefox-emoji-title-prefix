const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { findOverride, normalisePattern, searchEmoji, createStore, titlePrefix } = require("../src/lib/core.js");
const { emojiEntries, emojiGroups } = require("../src/lib/emoji-data.js");

describe("normalisePattern", () => {
  test("trims and lowercases", () => {
    assert.equal(normalisePattern("  WWW.Example.COM "), "www.example.com");
  });
  for (const bad of ["", "   ", "a b", "example.com/path", undefined]) {
    test(`rejects ${JSON.stringify(bad)}`, () => {
      assert.throws(() => normalisePattern(bad), /host name/);
    });
  }
});

describe("findOverride", () => {
  test("matches an exact host", () => {
    assert.deepEqual(findOverride({ "a.example.com": "🔥" }, "a.example.com"), { pattern: "a.example.com", emoji: "🔥" });
  });
  test("does not match a different host for an exact pattern", () => {
    assert.equal(findOverride({ "a.example.com": "🔥" }, "b.example.com"), null);
  });
  test("matching is case-insensitive on the host", () => {
    assert.equal(findOverride({ "a.example.com": "🔥" }, "A.Example.com").emoji, "🔥");
  });
  test("glob matches subdomains", () => {
    assert.equal(findOverride({ "*.example.com": "🌍" }, "www.prod.example.com").emoji, "🌍");
  });
  test("glob *.example.com does not match the bare domain", () => {
    assert.equal(findOverride({ "*.example.com": "🌍" }, "example.com"), null);
  });
  test("glob does not match a host that merely ends with the same letters", () => {
    assert.equal(findOverride({ "*.example.com": "🌍" }, "www.notexample.com"), null);
  });
  test("dots in patterns are literal", () => {
    assert.equal(findOverride({ "a.example.com": "🔥" }, "axexample.com"), null);
  });
  test("exact beats glob", () => {
    const overrides = { "*.example.com": "🌍", "www.example.com": "🔥" };
    assert.equal(findOverride(overrides, "www.example.com").emoji, "🔥");
  });
  test("more specific glob beats less specific glob", () => {
    const overrides = { "*.example.com": "🌍", "*.prod.example.com": "🚨" };
    assert.equal(findOverride(overrides, "www.prod.example.com").emoji, "🚨");
  });
  test("equally specific globs resolve alphabetically", () => {
    const overrides = { "b*.example.com": "🅱️", "a*.example.com": "🅰️" };
    assert.equal(findOverride({ ...overrides, "*.example.com": "x" }, "ab.example.com").emoji, "🅰️");
  });
  test("returns null when nothing is configured", () => {
    assert.equal(findOverride({}, "example.com"), null);
  });
});

describe("titlePrefix", () => {
  test("separates the emoji from the title with a space", () => {
    assert.equal(titlePrefix("🔥"), "🔥 ");
  });
});

describe("searchEmoji", () => {
  const entries = [
    { emoji: "🔥", keywords: "fire flame hot" },
    { emoji: "🌶️", keywords: "chilli pepper hot" }
  ];
  test("empty query returns everything", () => {
    assert.equal(searchEmoji(entries, "  ").length, 2);
  });
  test("every token must match", () => {
    assert.deepEqual(searchEmoji(entries, "hot fire").map((e) => e.emoji), ["🔥"]);
  });
  test("matches by substring, case-insensitively", () => {
    assert.deepEqual(searchEmoji(entries, "PEPP").map((e) => e.emoji), ["🌶️"]);
  });
});

describe("emoji data", () => {
  test("has no duplicate emoji", () => {
    const seen = emojiEntries.map((e) => e.emoji);
    assert.equal(new Set(seen).size, seen.length);
  });
  test("every entry has a label and keywords", () => {
    for (const entry of emojiEntries) {
      assert.notEqual(entry.label, "", entry.emoji);
      assert.notEqual(entry.keywords, "", entry.emoji);
    }
  });
  test("every group has an icon and entries", () => {
    for (const group of emojiGroups) {
      assert.ok(group.icon && group.entries.length > 0, group.label);
    }
  });
  test("finds a well-known emoji by name", () => {
    assert.ok(searchEmoji(emojiEntries, "rocket").some((e) => e.emoji === "🚀"));
  });
});

describe("store", () => {
  function fakeArea() {
    let data = {};
    return {
      get: async (key) => (key in data ? { [key]: structuredClone(data[key]) } : {}),
      set: async (values) => { data = { ...data, ...structuredClone(values) }; }
    };
  }
  test("starts empty", async () => {
    assert.deepEqual(await createStore(fakeArea()).all(), {});
  });
  test("saves with a normalised pattern, and removes", async () => {
    const store = createStore(fakeArea());
    await store.set(" *.Example.com ", "🔥");
    assert.deepEqual(await store.all(), { "*.example.com": "🔥" });
    await store.remove("*.example.com");
    assert.deepEqual(await store.all(), {});
  });
  test("rejects non-emoji values", async () => {
    await assert.rejects(createStore(fakeArea()).set("a.com", "x"), /not an emoji/);
  });
});
