import { Hono } from "hono";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { env } from "../lib/env";

const upload = new Hono();

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

async function uploadToR2(buffer: Buffer, name: string, ext: string): Promise<string> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: "auto",
    endpoint: env.r2.endpoint,
    credentials: { accessKeyId: env.r2.accessKeyId, secretAccessKey: env.r2.secretAccessKey },
  });
  await client.send(
    new PutObjectCommand({
      Bucket: env.r2.bucket,
      Key: name,
      Body: buffer,
      ContentType: MIME_TYPES[ext] || "application/octet-stream",
    })
  );
  return `${env.r2.publicUrl}/${name}`;
}

async function uploadToLocalDisk(buffer: Buffer, name: string): Promise<string> {
  const uploadDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, name), buffer);
  return `/uploads/${name}`;
}

upload.post("/", async (c) => {
  const form = await c.req.formData();
  const files: File[] = [];
  form.forEach((value, key) => {
    if (key === "images" && value instanceof File) files.push(value);
  });
  if (!files.length) {
    return c.json({ error: "No files uploaded" }, 400);
  }

  const useR2 = !!env.r2.bucket;
  const urls: string[] = [];

  for (const file of files) {
    const ext = path.extname(file.name).toLowerCase() || ".jpg";
    const name = `${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = useR2 ? await uploadToR2(buffer, name, ext) : await uploadToLocalDisk(buffer, name);
    urls.push(url);
  }

  return c.json({ urls });
});

export default upload;
