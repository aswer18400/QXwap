import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware";
import { ensureProfile } from "../lib/auth";
import { sendError, sendValidationError, handleError } from "../lib/http";

const router: IRouter = Router();

router.get("/profiles/me", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const profile = await ensureProfile(req.user.id, req.user.email);
  res.json({ profile });
});

router.get("/profiles/:id", async (req: Request, res: Response) => {
  const rawProfileId = req.params.id;
  const profileId = typeof rawProfileId === "string" ? rawProfileId.trim() : "";
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

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  username: z.string().trim().min(1).max(50).optional(),
  city: z.string().trim().min(1).max(100).optional(),
  avatarUrl: z.string().trim().url().optional(),
});

router.patch("/profiles/me", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;

  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, "ข้อมูลโปรไฟล์ไม่ถูกต้อง", parsed.error);
    return;
  }

  const { displayName, username, city, avatarUrl } = parsed.data;
  if (!displayName && !username && !city && !avatarUrl) {
    sendError(res, 400, "bad_request", "ต้องระบุอย่างน้อยหนึ่งฟิลด์");
    return;
  }

  try {
    const updates: Record<string, string> = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (username !== undefined) updates.username = username;
    if (city !== undefined) updates.city = city;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    const [profile] = await db
      .update(profilesTable)
      .set(updates)
      .where(eq(profilesTable.id, req.user.id))
      .returning();

    if (!profile) {
      sendError(res, 404, "not_found", "Profile not found");
      return;
    }

    res.json({ profile });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
