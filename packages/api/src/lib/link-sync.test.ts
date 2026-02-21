import { beforeEach, describe, expect, mock, test } from "bun:test";

// track calls to db operations
let deleteCalls: { where: string }[] = [];
let insertCalls: { values: unknown[] }[] = [];
let existingSkillIds = new Set<string>();
let existingResourceIds = new Set<string>();

const drizzleNameSym = Symbol.for("drizzle:Name");

function getTableName(table: unknown): string {
  if (table && typeof table === "object" && drizzleNameSym in table) {
    return (table as Record<symbol, string>)[drizzleNameSym]!;
  }
  return "unknown";
}

// mock the db module before importing link-sync
mock.module("@omniscient/db", () => {
  const createChain = () => {
    const chain: Record<string, unknown> = {};
    chain.delete = (table: unknown) => {
      const op = { table, where: "" };
      deleteCalls.push(op);
      return {
        where: (condition: unknown) => {
          op.where = String(condition);
        },
      };
    };
    chain.insert = (table: unknown) => {
      const op = { table, values: [] as unknown[] };
      insertCalls.push(op);
      return {
        values: (v: unknown[]) => {
          op.values = v;
        },
      };
    };
    chain.select = (_fields?: unknown) => ({
      from: (table: unknown) => ({
        where: async (_condition?: unknown) => {
          const tableName = getTableName(table);
          if (tableName === "skill") {
            return [...existingSkillIds].map((id) => ({ id }));
          }
          if (tableName === "skill_resource") {
            return [...existingResourceIds].map((id) => ({ id }));
          }
          return [];
        },
      }),
    });
    return chain;
  };

  return { db: createChain() };
});

// must import after mock setup
const { syncAutoLinks } = await import("./link-sync");

describe("syncAutoLinks", () => {
  const SKILL_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const TARGET_SKILL = "b2c3d4e5-f6a7-8901-bcde-f12345678901";
  const TARGET_RESOURCE = "c3d4e5f6-a7b8-9012-cdef-123456789012";
  const USER_ID = "user-123";

  beforeEach(() => {
    deleteCalls = [];
    insertCalls = [];
    existingSkillIds = new Set([TARGET_SKILL]);
    existingResourceIds = new Set([TARGET_RESOURCE]);
  });

  test("deletes existing auto links and inserts new ones", async () => {
    const md = `See [[skill:${TARGET_SKILL}]] and [[resource:${TARGET_RESOURCE}]]`;

    await syncAutoLinks(SKILL_UUID, md, USER_ID);

    expect(deleteCalls).toHaveLength(1);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]!.values).toHaveLength(2);
  });

  test("sets targetSkillId for skill mentions, targetResourceId for resource mentions", async () => {
    const md = `[[skill:${TARGET_SKILL}]] and [[resource:${TARGET_RESOURCE}]]`;

    await syncAutoLinks(SKILL_UUID, md, USER_ID);

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
    await syncAutoLinks(SKILL_UUID, "plain text with no mentions", USER_ID);

    expect(deleteCalls).toHaveLength(1);
    expect(insertCalls).toHaveLength(0);
  });

  test("ignores mentions that point to missing targets", async () => {
    const unknownSkill = "d4e5f6a7-b8c9-0123-def1-234567890123";
    const unknownResource = "e5f6a7b8-c9d0-1234-ef12-345678901234";
    const md = `[[skill:${TARGET_SKILL}]] [[skill:${unknownSkill}]] [[resource:${unknownResource}]]`;

    await syncAutoLinks(SKILL_UUID, md, USER_ID);

    expect(deleteCalls).toHaveLength(1);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]!.values).toHaveLength(1);
  });

  test("tags all links with origin markdown-auto", async () => {
    const md = `[[skill:${TARGET_SKILL}]]`;

    await syncAutoLinks(SKILL_UUID, md, USER_ID);

    const values = insertCalls[0]!.values as Array<{ metadata: Record<string, unknown> }>;
    for (const v of values) {
      expect(v.metadata).toEqual({ origin: "markdown-auto" });
    }
  });

  test("sets createdByUserId on all links", async () => {
    const md = `[[skill:${TARGET_SKILL}]]`;

    await syncAutoLinks(SKILL_UUID, md, USER_ID);

    const values = insertCalls[0]!.values as Array<{ createdByUserId: string }>;
    for (const v of values) {
      expect(v.createdByUserId).toBe(USER_ID);
    }
  });
});
