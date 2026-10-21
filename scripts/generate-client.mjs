// Prisma's pure JS client uses the verified npm-distributed WASM compiler.
// No native query or schema binary is required for client generation.
import internals from "@prisma/internals";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const generators = await internals.getGenerators({
  schemaPath: "prisma/schema.prisma",
  registry: {
    "prisma-client-js": {
      type: "rpc",
      generatorPath: require.resolve("@prisma/client/generator-build"),
      isNode: true,
    },
  },
  skipDownload: true,
});
try {
  for (const g of generators) await g.generate();
} finally {
  for (const g of generators) g.stop();
}
