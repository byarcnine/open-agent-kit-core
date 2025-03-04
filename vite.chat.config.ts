import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { visualizer } from 'rollup-plugin-visualizer';
import dts from "vite-plugin-dts";
import { resolve } from "path";
import fs from "fs";
import path from "path";
export default defineConfig({
  publicDir: false,
  plugins: [
    react(),
    tsconfigPaths(),
    visualizer(),
    dts({
      insertTypesEntry: false,
      rollupTypes: false,
      tsconfigPath: "tsconfig.chat.json",
      include: ["chat_module/index.tsx", "chat_module/type.ts"],
      afterBuild(emittedFiles) {
        const src = resolve("chat_dist/chat_module"), dest = resolve("chat_dist");
        if (!fs.existsSync(src)) return;
        emittedFiles.forEach((_, file) => fs.renameSync(`${src}/${path.basename(file)}`, `${dest}/${path.basename(file)}`));
        fs.rmdirSync(src, { recursive: true });
        console.log("✅ Moved .d.ts files & removed extra embed folder.");
      },
    }),
  ],
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || "development"
    ),
  },
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  build: {
    emptyOutDir: false,
    outDir: "chat_dist",
    lib: {
      entry: "chat_module/index.tsx",
      name: "ChatComponent",
      fileName: (format) => `chat.bundle.${format}.js`,
      formats: ["es", "cjs", "umd"],
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        exports: "named",
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "ReactJSXRuntime",
        },
        assetFileNames: (assetInfo) => {
          return assetInfo.name?.endsWith(".css") ? "chat.css" : "[name].[ext]";
        },
      },
    },
  },
});
