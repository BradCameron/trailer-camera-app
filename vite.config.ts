import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/trailer-camera-app/',
  plugins: [react()],
  define: {
    // This prevents a "process is not defined" error in the browser.
    // The Voice Assistant will correctly show a "not configured" message
    // if the API key isn't available during the build process.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
})