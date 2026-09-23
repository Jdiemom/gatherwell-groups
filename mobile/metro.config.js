// Lets the app import the website's own data modules (lib/steps.ts, lib/legal.ts,
// lib/destinations.ts, lib/match.ts, lib/airports.ts) straight from the repo root,
// so the phone and the website can never drift apart. See src/shared.ts.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const sharedLib = path.resolve(projectRoot, "..", "lib");

const config = getDefaultConfig(projectRoot);

// Metro refuses to serve files outside the project root unless they are watched.
config.watchFolders = [sharedLib];

// Keep module resolution inside mobile/node_modules. Without this Metro walks up
// and can pick the Next.js app's copy of React.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

module.exports = config;
