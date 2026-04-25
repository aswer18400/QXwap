import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../middlewares/authMiddleware";
import { sendError } from "../lib/http";

const router = Router();

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 4 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("รองรับเฉพาะไฟล์ภาพ (JPEG, PNG, WebP, GIF)"));
    }
  },
});

router.post(
  "/upload",
  requireAuth,
  (req: Request, res: Response, next) => {
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
  (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      sendError(res, 400, "bad_request", "ไม่พบไฟล์ที่อัปโหลด");
      return;
    }
    const urls = files.map((f) => `/uploads/${f.filename}`);
    res.json({ urls });
  },
);

export default router;
