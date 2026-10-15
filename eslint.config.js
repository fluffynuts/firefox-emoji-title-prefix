const globals = require("globals");

module.exports = [
  { ignores: ["node_modules/", "dist/"] },
  {
    files: ["src/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: { ...globals.browser, ...globals.webextensions, EmojiFavicon: "readonly", module: "readonly" }
    },
    rules: { "no-undef": "error", "no-unused-vars": "error" }
  },
  {
    files: ["test/**/*.js", "scripts/**/*.js", "eslint.config.js"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
    rules: { "no-undef": "error", "no-unused-vars": "error" }
  }
];
