import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { and, eq } from "drizzle-orm";
import { chatBus } from "../lib/eventBus";
import { parseCookies, getSession } from "../lib/session";
import { getDb } from "../queries/connection";
import { chatParticipants } from "@db/schema";

const sseRoutes = new Hono();

sseRoutes.get("/chat/:conversationId", async (c) => {
  const cookies = parseCookies(c.req.header("cookie") || "");
  const sid = cookies["sid"];
  const session = await getSession(sid);
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const conversationId = c.req.param("conversationId");
  const db = await getDb();
  const parts = await db
    .select()
    .from(chatParticipants)
    .where(and(eq(chatParticipants.conversationId, conversationId), eq(chatParticipants.userId, session.userId)));
  if (!parts.length) {
    return c.json({ error: "Forbidden" }, 403);
  }

  return streamSSE(c, async (stream) => {
    const handler = (message: unknown) => {
      stream.writeSSE({ data: JSON.stringify(message) });
    };
    chatBus.on(conversationId, handler);
    await new Promise<void>((resolve) => {
      stream.onAbort(() => {
        chatBus.off(conversationId, handler);
        resolve();
      });
    });
  });
});

export default sseRoutes;
