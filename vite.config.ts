import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { reactRouter } from "@react-router/dev/vite";
import { envOnlyMacros } from "vite-env-only";

export default defineConfig({
  plugins: [envOnlyMacros(), tailwindcss(), reactRouter(), tsconfigPaths()],
  optimizeDeps: {
    entries: ["app/**/*.tsx", "app/**/*.ts"],
    force: true,
    esbuildOptions: { target: "esnext" },
  },
});
