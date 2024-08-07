const path = require("path");

module.exports = {
  displayName: "frontend",
  preset: "ts-jest",
  testEnvironment: "jest-environment-jsdom",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  testMatch: ["**/packages/frontend/**/?(*.)+(spec|test).ts?(x)"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: path.resolve(__dirname, "tsconfig.json"),
      },
    ],
  },
  moduleNameMapper: {
    "\\.css$": "identity-obj-proxy",
    "^@/(.*)$": "<rootDir>/$1",
  },
};
