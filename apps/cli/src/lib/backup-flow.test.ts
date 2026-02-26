import { describe, expect, test } from "bun:test";

import { decideBackupAction } from "./backup-flow";

describe("decideBackupAction", () => {
  test("returns skip when local validation failed", () => {
    const result = decideBackupAction(
      {
        name: "my skill",
        slug: "my-skill",
        validationOk: false,
      },
      [],
    );

    expect(result.action).toBe("skip");
    expect(result.confidence).toBe("low");
  });

  test("returns update on exact slug match", () => {
    const result = decideBackupAction(
      {
        name: "my skill",
        slug: "my-skill",
        validationOk: true,
      },
      [
        {
          id: "1",
          slug: "my-skill",
          name: "something else",
        },
      ],
    );

    expect(result.action).toBe("update");
    expect(result.confidence).toBe("high");
    expect(result.target?.id).toBe("1");
  });

  test("returns update on unique name match", () => {
    const result = decideBackupAction(
      {
        name: "my skill",
        slug: "new-slug",
        validationOk: true,
      },
      [
        {
          id: "2",
          slug: "existing-slug",
          name: "my skill",
        },
      ],
    );

    expect(result.action).toBe("update");
    expect(result.confidence).toBe("medium");
    expect(result.target?.id).toBe("2");
  });

  test("returns create when there is no match", () => {
    const result = decideBackupAction(
      {
        name: "new skill",
        slug: "new-skill",
        validationOk: true,
      },
      [
        {
          id: "3",
          slug: "another",
          name: "another",
        },
      ],
    );

    expect(result.action).toBe("create");
    expect(result.confidence).toBe("high");
  });

  test("returns skip when multiple slug matches exist", () => {
    const result = decideBackupAction(
      {
        name: "duplicate",
        slug: "same",
        validationOk: true,
      },
      [
        {
          id: "4",
          slug: "same",
          name: "a",
        },
        {
          id: "5",
          slug: "same",
          name: "b",
        },
      ],
    );

    expect(result.action).toBe("skip");
    expect(result.confidence).toBe("low");
  });
});
