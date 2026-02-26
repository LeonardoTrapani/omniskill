import { beforeEach, describe, expect, mock, test } from "bun:test";

// track calls to db operations
let deleteCalls: { where: string }[] = [];
let insertCalls: { values: unknown[] }[] = [];
let skillOwners = new Map<string, string | null>();
let resourceOwners = new Map<string, string | null>();

const drizzleNameSym = Symbol.for("drizzle:Name");

function getTableName(table: unknown): string {
  if (table && typeof table === "object" && drizzleNameSym in table) {
    return (table as Record<symbol, string>)[drizzleNameSym]!;
  }
  return "unknown";
}

// mock the db module before importing link-sync
mock.module("@better-skills/db", () => {
  const createChain = () => {
    const chain: Record<string, unknown> = {};
    chain.delete = (table: unknown) => {
      const op = { table, where: "" };
      deleteCalls.push(op);
      return {
        where: (condition: unknown) => {
          op.where = String(condition);
          return {
            execute: async () => undefined,
          };
        },
      };
    };
    chain.insert = (table: unknown) => {
      const op = { table, values: [] as unknown[] };
      insertCalls.push(op);
      return {
        values: (v: unknown[]) => {
          op.values = v;
          return {
            execute: async () => undefined,
          };
        },
      };
    };

    const queryResult = <T>(rows: T[]) => ({
      limit: (n: number) => ({
        execute: async () => rows.slice(0, n),
      }),
      execute: async () => rows,
    });

    chain.select = (_fields?: unknown) => ({
      from: (table: unknown) => {
        const tableName = getTableName(table);
        const getRows = () => {
          if (tableName === "skill") {
            // first call is the source skill lookup (returns ownerUserId)
            // subsequent calls are target skill lookups
            return [...skillOwners.entries()].map(([id, ownerUserId]) => ({
              id,
              ownerUserId,
            }));
          }
          if (tableName === "skill_resource") {
            return [...resourceOwners.entries()].map(([id, ownerUserId]) => ({
              id,
              ownerUserId,
            }));
          }
          return [];
        };

        const queryChain = {
          where: (_condition?: unknown) => queryResult(getRows()),
          innerJoin: (_joinTable: unknown, _condition: unknown) => ({
            where: (_condition?: unknown) =>
              // resource join query — returns resources with parent skill owner
              queryResult(
                [...resourceOwners.entries()].map(([id, ownerUserId]) => ({
                  id,
                  ownerUserId,
                })),
              ),
          }),
        };
        return queryChain;
      },
    });
    // transaction: just run the callback with the same chain (good enough for unit tests)
    chain.transaction = async (fn: (tx: Record<string, unknown>) => Promise<void>) => {
      await fn(chain as Record<string, unknown>);
    };
    return chain;
  };

  return { db: createChain() };
});

// must import after mock setup
const { MentionSyntaxError, MentionValidationError, syncAutoLinks } = await import("./link-sync");

describe("syncAutoLinks", () => {
  const SKILL_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const TARGET_SKILL = "b2c3d4e5-f6a7-8901-bcde-f12345678901";
  const TARGET_RESOURCE = "c3d4e5f6-a7b8-9012-cdef-123456789012";
  const USER_ID = "user-123";
  const OWNER = "owner-1";

  function skillSource(sourceId: string, markdown: string) {
    return [{ type: "skill" as const, sourceId, sourceOwnerUserId: OWNER, markdown }];
  }

  beforeEach(() => {
    deleteCalls = [];
    insertCalls = [];
    skillOwners = new Map([
      [SKILL_UUID, OWNER],
      [TARGET_SKILL, OWNER],
    ]);
    resourceOwners = new Map([[TARGET_RESOURCE, OWNER]]);
  });

  test("deletes existing auto links and inserts new ones", async () => {
    const md = `See [[skill:${TARGET_SKILL}]] and [[resource:${TARGET_RESOURCE}]]`;

    await syncAutoLinks(skillSource(SKILL_UUID, md), USER_ID);

    expect(deleteCalls).toHaveLength(1);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]!.values).toHaveLength(2);
  });

  test("sets targetSkillId for skill mentions, targetResourceId for resource mentions", async () => {
    const md = `[[skill:${TARGET_SKILL}]] and [[resource:${TARGET_RESOURCE}]]`;

    await syncAutoLinks(skillSource(SKILL_UUID, md), USER_ID);

    const values = insertCalls[0]!.values as Array<{
      targetSkillId: string | null;
      targetResourceId: string | null;
      sourceSkillId: string;
      metadata: Record<string, unknown>;
    }>;

    const skillLink = values.find((v) => v.targetSkillId === TARGET_SKILL);
    expect(skillLink).toBeTruthy();
    expect(skillLink!.targetResourceId).toBeNull();
    expect(skillLink!.sourceSkillId).toBe(SKILL_UUID);
    expect(skillLink!.metadata).toEqual({ origin: "markdown-auto" });

    const resourceLink = values.find((v) => v.targetResourceId === TARGET_RESOURCE);
    expect(resourceLink).toBeTruthy();
    expect(resourceLink!.targetSkillId).toBeNull();
    expect(resourceLink!.sourceSkillId).toBe(SKILL_UUID);
  });

  test("only deletes (no insert) when markdown has no mentions", async () => {
    await syncAutoLinks(skillSource(SKILL_UUID, "plain text with no mentions"), USER_ID);

    expect(deleteCalls).toHaveLength(1);
    expect(insertCalls).toHaveLength(0);
  });

  test("throws when mentions point to missing targets", async () => {
    const unknownSkill = "d4e5f6a7-b8c9-0123-def1-234567890123";
    const unknownResource = "e5f6a7b8-c9d0-1234-ef12-345678901234";
    const md = `[[skill:${TARGET_SKILL}]] [[skill:${unknownSkill}]] [[resource:${unknownResource}]]`;

    await expect(syncAutoLinks(skillSource(SKILL_UUID, md), USER_ID)).rejects.toBeInstanceOf(
      MentionValidationError,
    );

    expect(deleteCalls).toHaveLength(0);
    expect(insertCalls).toHaveLength(0);
  });

  test("throws on mention tokens with non-uuid targets", async () => {
    const md = "See [[resource:references/guide.md]]";

    await expect(syncAutoLinks(skillSource(SKILL_UUID, md), USER_ID)).rejects.toBeInstanceOf(
      MentionSyntaxError,
    );

    expect(deleteCalls).toHaveLength(0);
    expect(insertCalls).toHaveLength(0);
  });

  test("tags all links with origin markdown-auto", async () => {
    const md = `[[skill:${TARGET_SKILL}]]`;

    await syncAutoLinks(skillSource(SKILL_UUID, md), USER_ID);

    const values = insertCalls[0]!.values as Array<{ metadata: Record<string, unknown> }>;
    for (const v of values) {
      expect(v.metadata).toEqual({ origin: "markdown-auto" });
    }
  });

  test("sets createdByUserId on all links", async () => {
    const md = `[[skill:${TARGET_SKILL}]]`;

    await syncAutoLinks(skillSource(SKILL_UUID, md), USER_ID);

    const values = insertCalls[0]!.values as Array<{ createdByUserId: string }>;
    for (const v of values) {
      expect(v.createdByUserId).toBe(USER_ID);
    }
  });

  test("throws on cross-owner skill mentions", async () => {
    const foreignSkill = "f6a7b8c9-d0e1-2345-6789-abcdef012345";
    skillOwners.set(foreignSkill, "other-owner");

    const md = `[[skill:${TARGET_SKILL}]] [[skill:${foreignSkill}]]`;

    await expect(syncAutoLinks(skillSource(SKILL_UUID, md), USER_ID)).rejects.toBeInstanceOf(
      MentionValidationError,
    );

    expect(deleteCalls).toHaveLength(0);
    expect(insertCalls).toHaveLength(0);
  });

  test("throws on cross-owner resource mentions", async () => {
    const foreignResource = "a7b8c9d0-e1f2-3456-789a-bcdef0123456";
    resourceOwners.set(foreignResource, "other-owner");

    const md = `[[resource:${TARGET_RESOURCE}]] [[resource:${foreignResource}]]`;

    await expect(syncAutoLinks(skillSource(SKILL_UUID, md), USER_ID)).rejects.toBeInstanceOf(
      MentionValidationError,
    );

    expect(deleteCalls).toHaveLength(0);
    expect(insertCalls).toHaveLength(0);
  });

  test("supports resource-source auto links", async () => {
    const SOURCE_RESOURCE = "12345678-9abc-def0-1234-56789abcdef0";
    const md = `[[skill:${TARGET_SKILL}]] [[resource:${TARGET_RESOURCE}]]`;

    await syncAutoLinks(
      [
        {
          type: "resource",
          sourceId: SOURCE_RESOURCE,
          sourceOwnerUserId: OWNER,
          markdown: md,
        },
      ],
      USER_ID,
    );

    expect(deleteCalls).toHaveLength(1);
    expect(insertCalls).toHaveLength(1);

    const values = insertCalls[0]!.values as Array<{
      sourceSkillId: string | null;
      sourceResourceId: string | null;
    }>;

    expect(values).toHaveLength(2);
    for (const value of values) {
      expect(value.sourceSkillId).toBeNull();
      expect(value.sourceResourceId).toBe(SOURCE_RESOURCE);
    }
  });
});
