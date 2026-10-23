import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   base: '/2962m/react-widget/',  // add this before deployment so it works on github pages
//   build: {
//     rollupOptions: {
//         output: {
//           entryFileNames: 'assets/[name].js',
//           chunkFileNames: 'assets/[name].js',
//           assetFileNames: 'assets/[name].[ext]'
//         }
//     }
//   }
// })

export default defineConfig({
  plugins: [react()],
  base: '/2962m/react-widget/dist/',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});