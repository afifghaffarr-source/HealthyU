module.exports = {
  // Run ESLint with --fix and Prettier on staged files.
  "*.{ts,tsx,js,jsx,cjs,mjs}": ["eslint --fix --max-warnings=200", "prettier --write"],
  "*.{json,md,yml,yaml}": ["prettier --write"],
};
