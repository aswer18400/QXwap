import { sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { offersTable } from "./offers";

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "pending",
  "shipped",
  "in_transit",
  "delivered",
  "finished",
]);

export const shipmentsTable = pgTable("shipments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id")
    .notNull()
    .unique()
    .references(() => offersTable.id, { onDelete: "restrict" }),
  status: shipmentStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const shipmentStepsTable = pgTable(
  "shipment_steps",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    shipmentId: varchar("shipment_id")
      .notNull()
      .references(() => shipmentsTable.id, { onDelete: "cascade" }),
    stepName: varchar("step_name", { length: 120 }).notNull(),
    note: text("note"),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("shipment_steps_shipment_id_idx").on(table.shipmentId)],
);

export const insertShipmentSchema = createInsertSchema(shipmentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertShipmentStepSchema = createInsertSchema(
  shipmentStepsTable,
).omit({ id: true });

export type Shipment = typeof shipmentsTable.$inferSelect;
export type ShipmentStep = typeof shipmentStepsTable.$inferSelect;
export type InsertShipment = z.infer<typeof insertShipmentSchema>;
