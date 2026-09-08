import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// GitHub Pages project site: https://craznail.github.io/memory-train-web/
export default defineConfig({
  plugins: [react()],
  base: "/memory-train-web/",
})
