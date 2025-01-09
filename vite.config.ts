import { defineConfig } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";
import UnoCSS from "unocss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { optimizeCssModules } from "vite-plugin-optimize-css-modules";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    UnoCSS(),
    remix(),
    nodePolyfills(),
    optimizeCssModules(),
    tsconfigPaths()
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'emacs': ['./app/lib/emacs-lisp.ts'],
          'vendor': [
            'react',
            'react-dom',
            '@remix-run/react',
            'xterm',
            'xterm-addon-fit',
            'xterm-addon-web-links'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 500
  }
});
