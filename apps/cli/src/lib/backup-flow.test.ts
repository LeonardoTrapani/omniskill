import { describe, expect, test } from "bun:test";

import { copyLocalSkillsToBackupTmp } from "./backup-flow";

describe("copyLocalSkillsToBackupTmp", () => {
  test("returns empty result for nonexistent source", async () => {
    const result = await copyLocalSkillsToBackupTmp({
      sourceDir: "/tmp/does-not-exist-backup-test",
    });

    expect(result.copiedCount).toBe(0);
    expect(result.skippedCount).toBe(0);
    expect(result.failedCount).toBe(0);
  });
});
