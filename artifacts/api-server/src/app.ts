import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";
import { sendError } from "./lib/http";
import { AppError } from "./lib/errors";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors({
    credentials: true,
    origin: corsOrigin ? corsOrigin.split(",") : true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PgStore = connectPgSimple(session);
const isProd = process.env.NODE_ENV === "production";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set");
}

app.set("trust proxy", 1);
app.use(
  session({
    name: "qx_sid",
    store: new PgStore({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(authMiddleware);

// ─── Rate limiting ────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "too_many_requests", message: "ลองใหม่อีกครั้งใน 15 นาที" },
  skipSuccessfulRequests: true,
});
app.use("/api/auth/signin", authLimiter);
app.use("/api/auth/signup", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "too_many_requests", message: "ส่งคำขอมากเกินไป" },
});
app.use("/api", apiLimiter);

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

// Serve web-app static files (manifest, sw.js, icons)
const webAppDir = path.join(process.cwd(), "..", "web-app");
if (fs.existsSync(webAppDir)) {
  app.use(express.static(webAppDir));
}

app.use("/api", router);

app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  // Malformed JSON body
  if (err instanceof SyntaxError && "body" in err) {
    sendError(res, 400, "bad_request", "Invalid JSON body");
    return;
  }

  // AppError that bubbled past a route's own handleError (belt-and-suspenders)
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message);
    return;
  }

  // PostgreSQL deadlock (40P01) or serialization failure (40001) —
  // safe to surface as 409 so the client can retry.
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    (err.code === "40P01" || err.code === "40001")
  ) {
    req.log.warn({ err }, "db.concurrency_conflict");
    sendError(res, 409, "conflict", "Concurrent request conflict, please retry");
    return;
  }

  req.log.error({ err }, "unhandled_error");
  sendError(res, 500, "internal_error", "Internal server error");
});

export default app;
