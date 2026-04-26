import type { SqlStep } from "./types";

export const messagingSteps: SqlStep[] = [
  {
    name: "alter.offer_messages_image_url",
    sql: `ALTER TABLE offer_messages ADD COLUMN IF NOT EXISTS image_url text`,
  },
];
