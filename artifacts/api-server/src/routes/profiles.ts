import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware";
import { ensureProfile } from "../lib/auth";
import { sendError, sendValidationError } from "../lib/http";

const router: IRouter = Router();

const updateProfileSchema = z
  .object({
    displayName: z.string().max(80).optional(),
    username: z.string().max(40).regex(/^[a-zA-Z0-9_]+$/, "username ใช้ได้แค่ a-z, 0-9, _").optional(),
    city: z.string().max(80).optional(),
    avatarUrl: z.string().max(500).optional(),
    bio: z.string().max(300).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "ต้องมีข้อมูลอย่างน้อย 1 ฟิลด์" });

router.get("/profiles/me", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const profile = await ensureProfile(req.user.id, req.user.email);
  res.json({ profile });
});

router.patch("/profiles/me", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, "ข้อมูลโปรไฟล์ไม่ถูกต้อง", parsed.error);
    return;
  }
  await ensureProfile(req.user.id, req.user.email);
  const [updated] = await db
    .update(profilesTable)
    .set(parsed.data)
    .where(eq(profilesTable.id, req.user.id))
    .returning();
  res.json({ profile: updated });
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

export default router;
