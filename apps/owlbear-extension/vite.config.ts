import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/bulette/",
  build: {
    outDir: "../../dist/owlbear-extension"
  }
});
