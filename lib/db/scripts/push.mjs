import { spawn } from "node:child_process";
import pg from "pg";

const { Client } = pg;

async function ensurePgcryptoExtension() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL, ensure the database is provisioned");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  } finally {
    await client.end();
  }
}

async function main() {
  await ensurePgcryptoExtension();

  const args = ["drizzle-kit", "push", "--config", "./drizzle.config.ts"];
  if (process.argv.includes("--force")) {
    args.splice(2, 0, "--force");
  }

  await new Promise((resolve, reject) => {
    const child = spawn("pnpm", args, {
      cwd: new URL("..", import.meta.url),
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`drizzle-kit push exited with code ${code ?? "unknown"}`));
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
