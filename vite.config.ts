import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // This makes the environment variables available in the client-side code.
  // Vite will automatically replace `process.env.API_KEY` with the value of the API_KEY
  // environment variable at build time.
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  // Set the base path for GitHub Pages deployment.
  // If your repository name is different, change 'trailer-camera-app' accordingly.
  base: '/trailer-camera-app/',
})
