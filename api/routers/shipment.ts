import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { shipments } from "@db/schema";

export const shipmentRouter = createRouter({
  start: authedQuery
    .input(z.object({ offerId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const id = crypto.randomUUID();
      await db.insert(shipments).values({ id, offerId: input.offerId, status: "started", currentStep: "started" });
      return { id };
    }),

  byId: authedQuery.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await getDb();
    const rows = await db.select().from(shipments).where(eq(shipments.id, input.id)).limit(1);
    return rows[0] || null;
  }),

  updateStep: authedQuery
    .input(z.object({ id: z.string(), step: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.update(shipments).set({ currentStep: input.step, updatedAt: new Date() }).where(eq(shipments.id, input.id));
      return { ok: true };
    }),

  finish: authedQuery.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const db = await getDb();
    await db.update(shipments).set({ status: "finished", updatedAt: new Date() }).where(eq(shipments.id, input.id));
    return { ok: true };
  }),
});
