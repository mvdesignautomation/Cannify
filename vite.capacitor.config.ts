import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// @ts-expect-error JS plugin alongside the TS Vite config
import { appEnvPlugin } from "./scripts/app-env-plugin.mjs";

/**
 * The native shell loads this bundle from Capacitor's local asset server.
 * Keep it separate from vite.config.ts: that config intentionally builds the
 * Vercel/Nitro server application rather than a static document.
 */
export default defineConfig({
  build: {
    // TanStack Start emits both a client and an internal SSR build. Stage its
    // output outside Capacitor's webDir, then copy only the static client
    // bundle to `dist` after the build.
    outDir: ".capacitor-build",
    emptyOutDir: true,
  },
  define: {
    // Native builds have no Better Auth server. The web build continues to get
    // its setting from its deployment environment and is not affected here.
    "import.meta.env.VITE_AUTH_ENABLED": JSON.stringify("false"),
    "import.meta.env.VITE_CAPACITOR": JSON.stringify("true"),
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    appEnvPlugin(),
    tailwindcss(),
    tanstackStart({
      spa: {
        enabled: true,
        prerender: {
          enabled: true,
          outputPath: "/index.html",
          crawlLinks: false,
          retryCount: 0,
        },
      },
    }),
    viteReact(),
  ],
});
