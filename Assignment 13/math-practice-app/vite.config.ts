import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * The security headers the site is hosted with, as written in `public/_headers`
 * (the file Netlify and Cloudflare Pages read; `vercel.json` repeats them).
 * Serving them from `npm run preview` too means the production build can be
 * tried locally under exactly the rules it will run under.
 */
function securityHeaders(): Record<string, string> {
  const text = readFileSync('public/_headers', 'utf8')
  const everything = text.split(/\n\s*\n/)[0] // the block for "/*"
  const headers: Record<string, string> = {}
  for (const line of everything.split('\n').slice(1)) {
    const colon = line.indexOf(':')
    if (colon > 0)
      headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim()
  }
  return headers
}

// https://vite.dev/config/
export default defineConfig({
  // Where the site lives. "/" for a site of its own; set VITE_BASE=/folder/ to
  // host it below one (for example on GitHub Pages).
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  preview: { headers: securityHeaders() },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Some page tests click through many questions, which is slow when the
    // whole suite runs in parallel.
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        // Test helpers, type-only files and the program entry point.
        'src/test/**',
        'src/types/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      reporter: ['text-summary', 'text', 'html'],
    },
  },
})
