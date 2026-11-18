import globals from "globals";
import react from "eslint-plugin-react";

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } }, globals: { ...globals.browser } },
    plugins: { react },
    rules: {
      "no-undef": "error", "no-dupe-keys": "error", "no-unreachable": "error",
      "no-unused-vars": ["warn", { caughtErrors: "none" }],
      "react/jsx-uses-vars": "error", "react/jsx-no-undef": "error",
    },
  },
  { files: ["*.config.js", "vite.config.js"], languageOptions: { globals: { ...globals.node } } },
];
