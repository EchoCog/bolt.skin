import { defineConfig } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";

export default defineConfig({
  plugins: [remix()],
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
