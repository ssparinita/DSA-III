import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Future Java backend: /api/* is proxied to Spring Boot / any server on :8080
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8080' } },
})
