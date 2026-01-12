import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize bundle size
    rollupOptions: {
      output: {
        // Manual chunks for better code splitting
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // UI components (Radix UI primitives)
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-scroll-area',
          ],

          // Data fetching and state management
          'vendor-data': [
            '@supabase/supabase-js',
            '@tanstack/react-query',
          ],

          // Forms and validation
          'vendor-forms': [
            'react-hook-form',
            '@hookform/resolvers',
            'zod',
          ],

          // Charts and visualization
          'vendor-charts': ['recharts'],

          // Icons and utilities
          'vendor-utils': [
            'lucide-react',
            'date-fns',
            'clsx',
            'tailwind-merge',
          ],
        },
      },
    },

    // Increase chunk size warning limit (default is 500kb)
    chunkSizeWarningLimit: 600,

    // Optimize CSS
    cssCodeSplit: true,

    // Source maps for production debugging
    sourcemap: mode === 'development',
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
    ],
  },
}));
