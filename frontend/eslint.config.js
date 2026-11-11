// Regras do ESLint do frontend: recomendadas do JavaScript, regras dos hooks do React e do recarregamento do Vite.
// Rodar com: npm run lint
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default [
  { ignores: ["dist", "node_modules"] },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // O ESLint puro não entende JSX: sem esta regra, componentes usados só no JSX parecem não usados
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]", argsIgnorePattern: "^[A-Z_]" }],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    files: ["vite.config.js", "eslint.config.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals.node },
    rules: js.configs.recommended.rules,
  },
];
