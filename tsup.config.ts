import { defineConfig } from "tsup"

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      types: "src/types.ts",
      parser: "src/content-blocks.ts",
      "adapters/sse": "src/adapters/sse.ts",
      "adapters/openai": "src/adapters/openai.ts",
      "adapters/anthropic": "src/adapters/anthropic.ts",
      vue: "src/vue/index.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ["react", "zustand", "vue"],
  },
  {
    entry: { "cli/index": "cli/index.ts" },
    format: ["esm"],
    banner: { js: "#!/usr/bin/env node" },
    platform: "node",
    sourcemap: false,
  },
])
