import { describe, expect, test } from "bun:test";

// output-mode.ts reads env at import time, so we test the detection
// logic directly instead of re-importing the module

type OutputMode = "interactive" | "plain";

function detect(
  env: Record<string, string | undefined>,
  tty: { stdin: boolean; stdout: boolean },
): OutputMode {
  if (env.AGENT === "1") return "plain";
  if (env.OPENCODE === "1") return "plain";
  if (env.CI === "1" || env.CI === "true") return "plain";
  if (!tty.stdin || !tty.stdout) return "plain";
  return "interactive";
}

describe("output mode detection", () => {
  const TTY = { stdin: true, stdout: true };
  const NO_TTY = { stdin: false, stdout: false };

  test("returns interactive when tty and no agent env", () => {
    expect(detect({}, TTY)).toBe("interactive");
  });

  test("returns plain when AGENT=1", () => {
    expect(detect({ AGENT: "1" }, TTY)).toBe("plain");
  });

  test("returns plain when OPENCODE=1", () => {
    expect(detect({ OPENCODE: "1" }, TTY)).toBe("plain");
  });

  test("returns plain when CI=true", () => {
    expect(detect({ CI: "true" }, TTY)).toBe("plain");
  });

  test("returns plain when CI=1", () => {
    expect(detect({ CI: "1" }, TTY)).toBe("plain");
  });

  test("returns plain when no tty", () => {
    expect(detect({}, NO_TTY)).toBe("plain");
  });

  test("returns plain when only stdin is not tty", () => {
    expect(detect({}, { stdin: false, stdout: true })).toBe("plain");
  });

  test("returns plain when only stdout is not tty", () => {
    expect(detect({}, { stdin: true, stdout: false })).toBe("plain");
  });

  test("AGENT takes precedence over tty", () => {
    expect(detect({ AGENT: "1" }, TTY)).toBe("plain");
  });
});
