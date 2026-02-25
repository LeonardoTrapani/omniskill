import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/runtime.ts",
  },
  format: "esm",
  outDir: "./dist",
  clean: true,
  noExternal: [/@omniskill\/.*/],
});
