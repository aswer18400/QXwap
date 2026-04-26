import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { registerSseClient } from "../lib/sse";

const router = Router();

router.get("/events", requireAuth, (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  registerSseClient(req.user.id, res);
});

export default router;
