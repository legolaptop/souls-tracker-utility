import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path matches the GitHub repository name for project-page deployment.
// All asset URLs and the router basename are derived from this value.
const REPO_NAME = 'souls-tracker-utility'

export default defineConfig({
  plugins: [react()],
  base: `/${REPO_NAME}/`,
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['src/test/**', 'src/vite-env.d.ts'],
    },
  },
})
