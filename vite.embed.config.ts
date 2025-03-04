import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [react(), tsconfigPaths(), visualizer()],
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || "development"
    ),
  },
  build: {
    lib: {
      entry: "embed/chat.tsx",
      name: "ChatComponent",
      fileName: (format) => `chat.bundle.${format}.js`,
    },
    outDir: "public/embed",
    rollupOptions: {
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
});
