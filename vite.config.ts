import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split vendor code into separate cacheable chunks.
        // Vercel CDN caches these independently — on redeploy, users only
        // re-download chunks that actually changed (usually just app code).
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-router": ["react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-ui": ["lucide-react"],
        },
      },
    },
    // Raise the default 500 KB chunk warning threshold (our vendor chunks are expected to be bigger)
    chunkSizeWarningLimit: 800,
  },
}));
