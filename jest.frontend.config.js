const path = require("path");

module.exports = {
  preset: "ts-jest",
  testEnvironment: "jest-environment-jsdom",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  testMatch: ["**/?(*.)+(spec|test).ts?(x)"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: path.resolve(__dirname, "packages/frontend/tsconfig.json"),
      },
    ],
  },
  moduleNameMapper: {
    "\\.css$": "identity-obj-proxy",
    "@/(.*)$": "<rootDir>/packages/frontend/$1",
  },
};
