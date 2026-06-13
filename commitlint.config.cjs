// Extends conventional-commits with project-specific types from
// .github/COMMIT_CONVENTION.md.
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "security",
        "privacy",
        "refactor",
        "test",
        "docs",
        "style",
        "chore",
        "perf",
        "ci",
        "build",
        "revert",
      ],
    ],
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [2, "always", 100],
  },
};
