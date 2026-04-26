import { logger } from "../logger";
import { authAndProfileSteps } from "./steps-auth-profile";
import { coreSteps } from "./steps-core";
import { listingAndSearchSteps } from "./steps-listing-search";
import { messagingSteps } from "./steps-messaging";
import { trustAndSafetySteps } from "./steps-trust-safety";
import type { SqlClient, SqlStep } from "./types";

export const startupSteps: SqlStep[] = [
  ...coreSteps,
  ...authAndProfileSteps,
  ...listingAndSearchSteps,
  ...trustAndSafetySteps,
  ...messagingSteps,
];

export async function runStartupMigrations(client: SqlClient): Promise<void> {
  for (const step of startupSteps) {
    try {
      await client.query(step.sql);
    } catch (err) {
      logger.warn({ err, step: step.name }, "migration.step_failed");
    }
  }
}
