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
mock.module("@omniskill/db", () => {
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
      from: (table: unknown) => {
        const tableName = getTableName(table);
        const queryChain = {
          where: async (_condition?: unknown) => {
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
          },
          innerJoin: (_joinTable: unknown, _condition: unknown) => ({
            where: async (_condition?: unknown) => {
              // resource join query — returns resources with parent skill owner
              return [...resourceOwners.entries()].map(([id, ownerUserId]) => ({
                id,
                ownerUserId,
              }));
            },
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
const { syncAutoLinks } = await import("./link-sync");

describe("syncAutoLinks", () => {
  const SKILL_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const TARGET_SKILL = "b2c3d4e5-f6a7-8901-bcde-f12345678901";
  const TARGET_RESOURCE = "c3d4e5f6-a7b8-9012-cdef-123456789012";
  const USER_ID = "user-123";
  const OWNER = "owner-1";

  beforeEach(() => {
    deleteCalls = [];
    insertCalls = [];
    // source skill + target skill both owned by OWNER
    skillOwners = new Map([
      [SKILL_UUID, OWNER],
      [TARGET_SKILL, OWNER],
    ]);
    // target resource owned by OWNER
    resourceOwners = new Map([[TARGET_RESOURCE, OWNER]]);
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
    // only the known TARGET_SKILL gets a link; unknownSkill and unknownResource are skipped
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

  test("silently skips cross-owner skill mentions instead of throwing", async () => {
    const foreignSkill = "f6a7b8c9-d0e1-2345-6789-abcdef012345";
    // add a skill owned by someone else
    skillOwners.set(foreignSkill, "other-owner");

    const md = `[[skill:${TARGET_SKILL}]] [[skill:${foreignSkill}]]`;

    // should not throw — just skips the foreign mention
    await syncAutoLinks(SKILL_UUID, md, USER_ID);

    expect(deleteCalls).toHaveLength(1);
    expect(insertCalls).toHaveLength(1);
    // only the same-owner TARGET_SKILL gets a link
    expect(insertCalls[0]!.values).toHaveLength(1);
    const values = insertCalls[0]!.values as Array<{ targetSkillId: string | null }>;
    expect(values[0]!.targetSkillId).toBe(TARGET_SKILL);
  });

  test("silently skips cross-owner resource mentions", async () => {
    const foreignResource = "a7b8c9d0-e1f2-3456-789a-bcdef0123456";
    resourceOwners.set(foreignResource, "other-owner");

    const md = `[[resource:${TARGET_RESOURCE}]] [[resource:${foreignResource}]]`;

    await syncAutoLinks(SKILL_UUID, md, USER_ID);

    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]!.values).toHaveLength(1);
    const values = insertCalls[0]!.values as Array<{ targetResourceId: string | null }>;
    expect(values[0]!.targetResourceId).toBe(TARGET_RESOURCE);
  });
});
