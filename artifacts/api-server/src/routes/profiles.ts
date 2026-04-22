import { Router, type IRouter, type Request, type Response } from "express";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware";
import { ensureProfile } from "../lib/auth";
import { sendError } from "../lib/http";

const router: IRouter = Router();

router.get("/profiles/me", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const profile = await ensureProfile(req.user.id, req.user.email);
  res.json({ profile });
});

router.get("/profiles/:id", async (req: Request, res: Response) => {
  const profileId = req.params.id?.trim();
  if (!profileId) {
    sendError(res, 400, "bad_request", "Profile id is required");
    return;
  }

  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, profileId));
  if (!profile) {
    sendError(res, 404, "not_found", "Profile not found");
    return;
  }

  res.json({ profile });
});

export default router;
