// build-server.mjs — programmatic esbuild (avoids shell quoting issues)
import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["api/boot.ts"],
  platform: "node",
  bundle: true,
  format: "esm",
  outdir: "dist",
  external: [
    "@electric-sql/pglite",
    "drizzle-orm",
    "drizzle-orm/pglite",
    "drizzle-orm/pg-core",
    "drizzle-orm/node-postgres",
    "pg",
    "bcryptjs",
    "uuid",
    "superjson",
    "hono",
    "@hono/node-server",
    "@trpc/server",
    "@trpc/server/adapters/fetch",
  ],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
});

console.log("Server build complete → dist/boot.js");
