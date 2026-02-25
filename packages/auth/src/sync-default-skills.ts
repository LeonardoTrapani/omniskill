import { sql } from "@better-skills/db";

import { syncDefaultSkillsForAllUsers } from "./default-skills";

async function main(): Promise<void> {
  try {
    const startedAt = Date.now();
    const result = await syncDefaultSkillsForAllUsers();
    const durationMs = Date.now() - startedAt;

    console.log(
      `[default-skills] templates=${result.templates} matched=${result.matched} updated=${result.updated} skipped=${result.skipped} failed=${result.failed} durationMs=${durationMs}`,
    );

    if (result.failed > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("[default-skills] sync failed", error);
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main();
