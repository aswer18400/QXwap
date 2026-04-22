import { Router, type IRouter, type Request, type Response } from "express";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();

router.get("/profiles/me", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, req.user.id));
  res.json({ profile: profile ?? null });
});

router.get("/profiles/:id", async (req: Request, res: Response) => {
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, String(req.params.id)));
  res.json({ profile: profile ?? null });
});

export default router;
