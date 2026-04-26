import type { SqlStep } from "./types";

export const trustAndSafetySteps: SqlStep[] = [
  {
    name: "table.disputes",
    sql: `
      CREATE TABLE IF NOT EXISTS disputes (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reported_user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        deal_id varchar REFERENCES deals(id) ON DELETE SET NULL,
        reason varchar NOT NULL,
        detail text,
        status varchar NOT NULL DEFAULT 'open',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `,
  },
  {
    name: "table.reviews",
    sql: `
      CREATE TABLE IF NOT EXISTS reviews (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id varchar NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
        reviewer_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reviewee_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment text,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(deal_id, reviewer_id)
      )
    `,
  },
];
