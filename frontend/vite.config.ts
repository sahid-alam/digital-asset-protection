import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_BUILD_HASH': JSON.stringify(Date.now().toString(36).slice(-6)),
  },
})
