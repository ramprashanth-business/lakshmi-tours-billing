import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT: "base" must match your GitHub repo name exactly, wrapped in slashes.
// Example: if your repo is github.com/yourname/lakshmi-tours-billing
// then base should stay "/lakshmi-tours-billing/".
// If you rename the repo, update this to match, or the live site will load a blank page.
export default defineConfig({
  plugins: [react()],
  base: "/lakshmi-tours-billing/",
});
