import { defineConfig } from 'vite'

// GitHub Pages serves this project at https://9ooseul2.github.io/my-room/.
// Keep the development server at the domain root, while building production
// assets with the repository name as their URL prefix.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/my-room/' : '/',
})
