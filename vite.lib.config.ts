import { defineConfig } from "vite";
import { resolve } from "path";
import tsconfigPaths from "vite-tsconfig-paths";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
  build: {
    outDir: "lib_dist",
    lib: {
      entry: resolve(__dirname, "app/lib/lib.ts"),
      name: "OAKProvider",
      fileName: "oak-provider",
      formats: ["es", "cjs"], // Common formats for maximum compatibility
    },
    rollupOptions: {
      external: ["react", "react-dom", "crypto", "@prisma/client"], // Add any external dependencies here
      output: {
        // Ensure proper file extensions and directory structure
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
});
