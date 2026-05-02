import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { env } from "../lib/env";
import { parseCookies, getSession } from "../lib/session";
import { getDb } from "../queries/connection";
import { pushSubscriptions } from "@db/schema";

const pushRoutes = new Hono();

pushRoutes.get("/vapid-public-key", (c) => {
  return c.json({ key: env.vapid.publicKey });
});

pushRoutes.post("/subscribe", async (c) => {
  const cookies = parseCookies(c.req.header("cookie") || "");
  const session = await getSession(cookies["sid"]);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json<{ endpoint: string; keys: { p256dh: string; auth: string } }>();
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return c.json({ error: "Invalid subscription" }, 400);
  }

  const db = await getDb();
  await db
    .insert(pushSubscriptions)
    .values({
      userId: session.userId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: session.userId, p256dh: body.keys.p256dh, auth: body.keys.auth },
    });

  return c.json({ ok: true });
});

pushRoutes.delete("/subscribe", async (c) => {
  const cookies = parseCookies(c.req.header("cookie") || "");
  const session = await getSession(cookies["sid"]);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json<{ endpoint: string }>();
  if (!body?.endpoint) return c.json({ error: "Missing endpoint" }, 400);

  const db = await getDb();
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, body.endpoint));
  return c.json({ ok: true });
});

export default pushRoutes;
