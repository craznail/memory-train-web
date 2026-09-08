import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Relative base works for Capacitor file:// and GitHub Pages + HashRouter
export default defineConfig({
  plugins: [react()],
  base: "./",
})
