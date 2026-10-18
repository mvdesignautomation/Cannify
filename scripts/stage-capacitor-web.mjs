#!/usr/bin/env node
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { projectRoot } from "./with-app-env.mjs";

const root = projectRoot();
const buildDir = join(root, ".capacitor-build");
const clientDir = join(buildDir, "client");
const indexPath = join(clientDir, "index.html");
const webDir = join(root, "dist");

if (!existsSync(indexPath)) {
  throw new Error(`Capacitor web build did not produce ${indexPath}`);
}

// Capacitor requires its configured webDir to contain index.html directly.
// Start's server output is intentionally excluded: it is not runnable inside
// the Android asset WebView and would only duplicate the browser bundle.
rmSync(webDir, { recursive: true, force: true });
cpSync(clientDir, webDir, { recursive: true });
rmSync(buildDir, { recursive: true, force: true });
