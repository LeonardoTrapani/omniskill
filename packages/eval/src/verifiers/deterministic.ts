import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CheckResult, DeterministicVerifier } from "../types.js";

export async function runDeterministicChecks(
  verifier: DeterministicVerifier,
  workDir: string,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const check of verifier.checks) {
    try {
      switch (check.kind) {
        case "file-exists": {
          const filePath = join(workDir, check.config.path as string);
          const exists = existsSync(filePath);
          results.push({
            name: check.name,
            passed: exists,
            detail: exists ? "File found" : `File not found: ${check.config.path}`,
          });
          break;
        }

        case "file-contains": {
          const filePath = join(workDir, check.config.path as string);
          try {
            const content = await Bun.file(filePath).text();
            const pattern = check.config.pattern as string;
            const isRegex = (check.config.isRegex as boolean) ?? false;
            const shouldMatch = (check.config.shouldMatch as boolean) ?? true;

            let matches: boolean;
            if (isRegex) {
              const re = new RegExp(pattern, "m");
              matches = re.test(content);
            } else {
              matches = content.includes(pattern);
            }

            const passed = shouldMatch ? matches : !matches;
            results.push({
              name: check.name,
              passed,
              detail: passed
                ? "Pattern check passed"
                : `Pattern "${pattern}" ${shouldMatch ? "not found" : "found unexpectedly"}`,
            });
          } catch {
            results.push({
              name: check.name,
              passed: false,
              detail: `Could not read file: ${check.config.path}`,
            });
          }
          break;
        }

        case "command-exit": {
          const command = check.config.command as string;
          try {
            const proc = Bun.spawn(["bash", "-c", command], {
              cwd: workDir,
              stdout: "pipe",
              stderr: "pipe",
            });
            const exitCode = await proc.exited;
            results.push({
              name: check.name,
              passed: exitCode === 0,
              detail: exitCode === 0 ? "Command succeeded" : `Exit code: ${exitCode}`,
            });
          } catch (e) {
            results.push({
              name: check.name,
              passed: false,
              detail: `Command failed: ${e instanceof Error ? e.message : String(e)}`,
            });
          }
          break;
        }

        case "test-pass": {
          const testCommand = (check.config.command as string) ?? "bun test";
          try {
            const proc = Bun.spawn(["bash", "-c", testCommand], {
              cwd: workDir,
              stdout: "pipe",
              stderr: "pipe",
            });
            const exitCode = await proc.exited;
            results.push({
              name: check.name,
              passed: exitCode === 0,
              detail: exitCode === 0 ? "Tests passed" : `Tests failed (exit: ${exitCode})`,
            });
          } catch (e) {
            results.push({
              name: check.name,
              passed: false,
              detail: `Test execution failed: ${e instanceof Error ? e.message : String(e)}`,
            });
          }
          break;
        }
      }
    } catch (e) {
      results.push({
        name: check.name,
        passed: false,
        detail: `Unexpected error: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  return results;
}
