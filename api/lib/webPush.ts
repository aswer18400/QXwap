import webpush from "web-push";
import { eq } from "drizzle-orm";
import { env } from "./env";
import { getDb } from "../queries/connection";
import { pushSubscriptions } from "@db/schema";

let initialized = false;

function init() {
  if (initialized || !env.vapid.publicKey || !env.vapid.privateKey) return;
  webpush.setVapidDetails(env.vapid.email, env.vapid.publicKey, env.vapid.privateKey);
  initialized = true;
}

export async function sendPush(
  userId: string,
  payload: { title: string; body: string; data?: Record<string, unknown> }
) {
  init();
  if (!initialized) return;

  const db = await getDb();
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        if (err.statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
        }
      }
    })
  );
}
