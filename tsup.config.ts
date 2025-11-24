import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "cli/index": "src/cli/index.ts",
    "tui/index": "src/tui/index.ts",
  },
  format: ["esm"],
  target: "node18",
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  outDir: "dist",
  external: ["js-tiktoken"],
});
