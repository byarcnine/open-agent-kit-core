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
      entry: "chat_widget/index.tsx",
      name: "OAKChatWidget",
      fileName: (format) => `chatWidget.bundle.${format}.js`,
    },
    outDir: "public/chat_widget",
    rollupOptions: {
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
      external: (id) => /chat_module/.test(id),
    },
  },
});
