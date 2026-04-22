import { Router, type IRouter, type Request, type Response } from "express";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware";
import { ensureProfile } from "../lib/auth";

const router: IRouter = Router();

router.get("/profiles/me", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const profile = await ensureProfile(req.user.id, req.user.email);
  res.json({ profile });
});

router.get("/profiles/:id", async (req: Request, res: Response) => {
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, String(req.params.id)));
  res.json({ profile: profile ?? null });
});

export default router;
