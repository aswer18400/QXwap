import { Router, type Request, type Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { requireAuth } from "../middlewares/authMiddleware";
import { sendError } from "../lib/http";

const router = Router();

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 4 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("รองรับเฉพาะไฟล์ภาพ (JPEG, PNG, WebP, GIF)"));
    }
  },
});

function uploadToCloudinary(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "qxwap", resource_type: "image" },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("upload failed"));
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

router.post(
  "/upload",
  requireAuth,
  (req: Request, res: Response, next) => {
    if (!process.env.CLOUDINARY_URL) {
      sendError(res, 503, "service_unavailable", "Image upload ยังไม่ได้ตั้งค่า CLOUDINARY_URL");
      return;
    }
    upload.array("images", 4)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          sendError(res, 400, "bad_request", "ไฟล์ใหญ่เกิน 5MB");
          return;
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          sendError(res, 400, "bad_request", "อัปโหลดได้สูงสุด 4 รูป");
          return;
        }
        sendError(res, 400, "bad_request", err.message);
        return;
      }
      if (err) {
        sendError(res, 400, "bad_request", String(err.message || err));
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      sendError(res, 400, "bad_request", "ไม่พบไฟล์ที่อัปโหลด");
      return;
    }
    try {
      const urls = await Promise.all(files.map((f) => uploadToCloudinary(f.buffer)));
      res.json({ urls });
    } catch {
      sendError(res, 500, "internal_error", "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่");
    }
  },
);

export default router;
