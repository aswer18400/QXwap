import { Hono } from "hono";
import { writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";

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
  const urls: string[] = [];
  for (const file of files) {
    const ext = path.extname(file.name) || ".jpg";
    const name = `${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, name);
    await writeFile(filePath, buffer);
    urls.push(`/uploads/${name}`);
  }
  return c.json({ urls });
});

export default upload;
