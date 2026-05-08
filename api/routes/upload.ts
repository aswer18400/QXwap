import { Hono } from "hono";
import { writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { env } from "../lib/env";

const upload = new Hono();

upload.post("/", async (c) => {
  const form = await c.req.formData();
  const files: File[] = [];
  form.forEach((value, key) => {
    if (key === "images" && value instanceof File) {
      files.push(value);
    }
  });
  if (!files.length) {
    return c.json({ error: "No files uploaded" }, 400);
  }
  // Use root-level uploads dir so it can be served by both dev and prod
  const uploadDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadDir, { recursive: true });
  const requestUrl = new URL(c.req.url);
  const forwardedHost = c.req.header("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = c.req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = forwardedHost || c.req.header("host") || requestUrl.host;
  const proto = env.isProduction ? "https" : forwardedProto || requestUrl.protocol.replace(":", "");
  const origin = `${proto}://${host}`;
  const urls: string[] = [];
  for (const file of files) {
    const ext = path.extname(file.name) || ".jpg";
    const name = `${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, name);
    await writeFile(filePath, buffer);
    urls.push(`${origin}/uploads/${name}`);
  }
  return c.json({ urls });
});

export default upload;
