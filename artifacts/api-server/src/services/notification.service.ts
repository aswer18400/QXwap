import { db, notificationsTable } from "@workspace/db";
import type { notificationTypeEnum } from "@workspace/db";
import { broadcastToUser } from "../lib/sse";

type DbOrTx =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

type NotificationType = (typeof notificationTypeEnum.enumValues)[number];

interface NotifyParams {
  userId: string;
  actorId?: string;
  type: NotificationType;
  offerId?: string;
  dealId?: string;
  title: string;
  body?: string;
}

export async function notify(tx: DbOrTx, params: NotifyParams) {
  const [row] = await tx.insert(notificationsTable).values({
    userId: params.userId,
    actorId: params.actorId ?? null,
    type: params.type,
    offerId: params.offerId ?? null,
    dealId: params.dealId ?? null,
    title: params.title,
    body: params.body ?? null,
  }).returning();

  broadcastToUser(params.userId, "notification", row);
}
