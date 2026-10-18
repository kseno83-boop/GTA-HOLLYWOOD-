import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Build in un solo index.html (gioco + Phaser + mappa): si pubblica come la vecchia demo.
// public/music/playlist.js resta un file a parte, così si possono aggiungere brani senza ricompilare.
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
  build: { target: "es2022", chunkSizeWarningLimit: 4000 },
});
