const path = require("path");

module.exports = {
  displayName: "backend",
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  testMatch: ["**/packages/backend/**/?(*.)+(spec|test).ts?(x)"],
  transform: {
    "^.+\\.ts?$": "babel-jest",
  },
};
