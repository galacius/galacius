const path = require("node:path");

const cwd = process.cwd();

const toRelative = (files, separator = " ") =>
  files.map((f) => JSON.stringify(path.relative(cwd, f).replaceAll("\\", "/"))).join(separator);

module.exports = {
  "*.{ts,tsx}": (files) => {
    if (!files?.length) return [];
    return [`eslint --fix ${toRelative(files)}`];
  },
  "*.{ts,tsx,js,jsx,json,css,md,yml}": (files) => {
    if (!files?.length) return [];
    return [`prettier --write ${toRelative(files)}`];
  },
};
