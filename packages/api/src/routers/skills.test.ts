/* eslint-disable unicorn/no-thenable -- drizzle query builders are thenable by design */
import { beforeEach, describe, expect, test, mock } from "bun:test";
import { randomUUID } from "crypto";

// -- in-memory store types --

type SkillRow = {
  id: string;
  ownerUserId: string;
  slug: string;
  name: string;
  description: string;
  skillMarkdown: string;
  frontmatter: Record<string, unknown>;
  metadata: Record<string, unknown>;
  isDefault: boolean;
  sourceUrl: string | null;
  sourceIdentifier: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ResourceRow = {
  id: string;
  skillId: string;
  path: string;
  kind: "reference" | "script" | "asset" | "other";
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

type LinkRow = {
  id: string;
  sourceSkillId: string | null;
  sourceResourceId: string | null;
  targetSkillId: string | null;
  targetResourceId: string | null;
  kind: string;
  note: string | null;
  metadata: Record<string, unknown>;
  createdByUserId: string | null;
  createdAt: Date;
};

let skills: SkillRow[] = [];
let resources: ResourceRow[] = [];
let links: LinkRow[] = [];

// -- condition evaluation engine --

type Condition =
  | { op: "eq"; field: string; value: unknown }
  | { op: "gt"; field: string; value: unknown }
  | { op: "lt"; field: string; value: unknown }
  | { op: "ilike"; field: string; value: string }
  | { op: "inArray"; field: string; values: unknown[] }
  | { op: "and"; conditions: (Condition | undefined)[] }
  | { op: "or"; conditions: (Condition | undefined)[] }
  | { op: "sql"; raw: string };

function evalCondition(row: Record<string, unknown>, cond: Condition | undefined): boolean {
  if (!cond) return true;
  switch (cond.op) {
    case "eq":
      return row[cond.field] === cond.value;
    case "gt":
      return (row[cond.field] as string | number | Date) > (cond.value as string | number | Date);
    case "lt":
      return (row[cond.field] as string | number | Date) < (cond.value as string | number | Date);
    case "ilike": {
      const val = String(row[cond.field] ?? "").toLowerCase();
      const pat = cond.value.toLowerCase().replace(/%/g, ".*");
      return new RegExp(`^${pat}$`).test(val);
    }
    case "inArray":
      return cond.values.includes(row[cond.field]);
    case "and":
      return cond.conditions.every((c) => evalCondition(row, c));
    case "or":
      return cond.conditions.some((c) => evalCondition(row, c));
    case "sql": {
      if (cond.raw.includes("markdown-auto")) {
        const meta = row.metadata as Record<string, unknown> | undefined;
        return meta?.origin === "markdown-auto";
      }
      return true;
    }
  }
}

// drizzle column → JS property key
function getPropertyKey(col: unknown): string {
  if (col && typeof col === "object" && "config" in col) {
    const config = (col as { config: { name?: string } }).config;
    if (config?.name) return snakeToCamel(config.name);
  }
  if (col && typeof col === "object" && "name" in col) {
    return snakeToCamel((col as { name: string }).name);
  }
  return String(col);
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// -- table name detection --

const drizzleNameSym = Symbol.for("drizzle:Name");

function getTableName(table: unknown): string {
  if (table && typeof table === "object" && drizzleNameSym in table) {
    return (table as Record<symbol, string>)[drizzleNameSym]!;
  }
  return "unknown";
}

function getStore(tableName: string): Record<string, unknown>[] {
  switch (tableName) {
    case "skill":
      return skills;
    case "skill_resource":
      return resources;
    case "skill_link":
      return links;
    default:
      return [];
  }
}

function filterRows(store: Record<string, unknown>[], where?: Condition) {
  if (!where) return [...store];
  return store.filter((row) => evalCondition(row, where));
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }
  return (a as string | number) > (b as string | number) ? 1 : -1;
}

function applyOrder(rows: Record<string, unknown>[], orderBy: unknown[]) {
  if (orderBy.length === 0) return [...rows];

  return [...rows].sort((left, right) => {
    for (const order of orderBy) {
      if (!order || typeof order !== "object") continue;
      if (!("direction" in order) || !("col" in order)) continue;

      const direction = (order as { direction: "asc" | "desc" }).direction;
      const field = getPropertyKey((order as { col: unknown }).col);
      const cmp = compareValues(left[field], right[field]);
      if (cmp === 0) continue;
      return direction === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

function projectFields(rows: Record<string, unknown>[], fieldMap?: Record<string, unknown>) {
  if (!fieldMap) return rows;
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [alias, col] of Object.entries(fieldMap)) {
      out[alias] = row[getPropertyKey(col)];
    }
    return out;
  });
}

// -- fake table column objects --
// drizzle columns need a config.name so getPropertyKey works

function fakeCol(dbName: string) {
  return { config: { name: dbName }, name: dbName, mapFromDriverValue: true };
}

// create fake table objects with Symbol.for("drizzle:Name")
function fakeTable(name: string, columns: Record<string, string>) {
  const table: Record<string | symbol, unknown> = { [drizzleNameSym]: name };
  for (const [jsKey, dbName] of Object.entries(columns)) {
    table[jsKey] = fakeCol(dbName);
  }
  // drizzle inferSelect type marker (passthrough)
  table.$inferSelect = {};
  table.$inferInsert = {};
  return table;
}

const fakeSkill = fakeTable("skill", {
  id: "id",
  ownerUserId: "owner_user_id",
  slug: "slug",
  name: "name",
  description: "description",
  skillMarkdown: "skill_markdown",
  frontmatter: "frontmatter",
  metadata: "metadata",
  isDefault: "is_default",
  sourceUrl: "source_url",
  sourceIdentifier: "source_identifier",
  createdAt: "created_at",
  updatedAt: "updated_at",
});

const fakeSkillResource = fakeTable("skill_resource", {
  id: "id",
  skillId: "skill_id",
  path: "path",
  kind: "kind",
  content: "content",
  metadata: "metadata",
  createdAt: "created_at",
  updatedAt: "updated_at",
});

const fakeSkillLink = fakeTable("skill_link", {
  id: "id",
  sourceSkillId: "source_skill_id",
  sourceResourceId: "source_resource_id",
  targetSkillId: "target_skill_id",
  targetResourceId: "target_resource_id",
  kind: "kind",
  note: "note",
  metadata: "metadata",
  createdByUserId: "created_by_user_id",
  createdAt: "created_at",
});

// -- operator builders --

function buildEq(col: unknown, value: unknown): Condition {
  return { op: "eq", field: getPropertyKey(col), value };
}
function buildGt(col: unknown, value: unknown): Condition {
  return { op: "gt", field: getPropertyKey(col), value };
}
function buildLt(col: unknown, value: unknown): Condition {
  return { op: "lt", field: getPropertyKey(col), value };
}
function buildIlike(col: unknown, value: string): Condition {
  return { op: "ilike", field: getPropertyKey(col), value };
}
function buildInArray(col: unknown, values: unknown[]): Condition {
  return { op: "inArray", field: getPropertyKey(col), values };
}
function buildAnd(...conditions: (Condition | undefined)[]): Condition {
  return { op: "and", conditions };
}
function buildOr(...conditions: (Condition | undefined)[]): Condition {
  return { op: "or", conditions };
}
function buildDesc(_col: unknown) {
  return { direction: "desc", col: _col };
}

// sql tagged template — returns a Condition for where usage, but also acts as a value for other uses
function buildSql(strings: TemplateStringsArray, ..._values: unknown[]): Condition {
  return { op: "sql", raw: strings.join("?") };
}
// sql needs to also work as a regular tagged template for schema (default values etc)
// we attach a noop for that
(buildSql as unknown as Record<string, unknown>).raw = () => "";

// -- mock drizzle-orm --

const fakeRelations = () => ({});

mock.module("drizzle-orm", () => ({
  eq: buildEq,
  gt: buildGt,
  lt: buildLt,
  ilike: buildIlike,
  inArray: buildInArray,
  and: buildAnd,
  or: buildOr,
  desc: buildDesc,
  getTableColumns: (table: Record<string, unknown>) => table,
  sql: buildSql,
  relations: fakeRelations,
  asc: (col: unknown) => ({ direction: "asc", col }),
}));

// mock pg-core exports that the schema file imports
mock.module("drizzle-orm/pg-core", () => ({
  pgTable: (name: string, _cols: unknown, _extra?: unknown) => {
    // return our pre-built fake table if name matches
    if (name === "skill") return fakeSkill;
    if (name === "skill_resource") return fakeSkillResource;
    if (name === "skill_link") return fakeSkillLink;
    return { [drizzleNameSym]: name };
  },
  pgEnum: (_name: string, values: string[]) => {
    const fn = (colName: string) => ({
      config: { name: colName },
      name: colName,
      enumValues: values,
      mapFromDriverValue: true,
    });
    fn.enumName = _name;
    fn.enumValues = values;
    return fn;
  },
  text: (name: string) => fakeCol(name),
  uuid: (name: string) => {
    const col: Record<string, unknown> = { ...fakeCol(name) };
    col.defaultRandom = () => {
      const c = { ...col };
      c.primaryKey = () => c;
      c.notNull = () => c;
      c.references = () => c;
      return c;
    };
    col.primaryKey = () => col;
    col.notNull = () => {
      const c = { ...col };
      c.references = () => c;
      return c;
    };
    col.references = () => col;
    return col;
  },
  timestamp: (name: string) => {
    const col: Record<string, unknown> = { ...fakeCol(name) };
    col.defaultNow = () => {
      const c = { ...col };
      c.notNull = () => c;
      c.$onUpdate = () => c;
      return c;
    };
    col.notNull = () => col;
    col.$onUpdate = () => col;
    return col;
  },
  jsonb: (name: string) => {
    const col: Record<string, unknown> = { ...fakeCol(name) };
    col.$type = () => {
      const c = { ...col };
      c.notNull = () => {
        const c2 = { ...c };
        c2.default = () => c2;
        return c2;
      };
      c.default = () => c;
      return c;
    };
    col.notNull = () => {
      const c = { ...col };
      c.default = () => c;
      return c;
    };
    col.default = () => col;
    return col;
  },
  boolean: (name: string) => fakeCol(name),
  index: () => ({ on: () => ({ where: () => ({}) }) }),
  uniqueIndex: () => ({ on: () => ({ where: () => ({}) }) }),
  check: () => ({}),
}));

// mock drizzle adapter so the real db module doesn't try to connect
mock.module("drizzle-orm/postgres-js", () => ({
  drizzle: () => ({}),
}));

mock.module("postgres", () => ({
  default: () => ({
    end: async () => undefined,
  }),
}));

// mock env
mock.module("@better-skills/env/server", () => ({
  env: {
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    BETTER_AUTH_SECRET: "test-secret",
    BETTER_AUTH_URL: "http://localhost:3000",
    CORS_ORIGIN: "http://localhost:3001",
  },
}));

// -- mock @better-skills/db with our in-memory store --

function makeFullSelectChain(fieldMap?: Record<string, unknown>) {
  return {
    from: (table: unknown) => {
      const tableName = getTableName(table);
      let whereCondition: Condition | undefined;
      let orderBy: unknown[] = [];
      let joinedRows: Record<string, unknown>[] | null = null;

      const getRows = () => {
        if (joinedRows) return joinedRows;
        return getStore(tableName) as Record<string, unknown>[];
      };

      const mkResult = () => {
        const filtered = filterRows(getRows(), whereCondition);
        const ordered = applyOrder(filtered, orderBy);
        return projectFields(ordered, fieldMap);
      };

      const orderByResult = (...clauses: unknown[]) => {
        orderBy = clauses;
        return {
          limit: (n: number) => Promise.resolve(mkResult().slice(0, n)),
          execute: () => Promise.resolve(mkResult()),
          then: (resolve: (v: unknown) => void) => resolve(mkResult()),
        };
      };

      const limitResult = (n: number) => ({
        execute: () => Promise.resolve(mkResult().slice(0, n)),
        then: (resolve: (v: unknown) => void) => resolve(mkResult().slice(0, n)),
      });

      const afterWhere = {
        orderBy: orderByResult,
        limit: limitResult,
        execute: () => Promise.resolve(mkResult()),
        then: (resolve: (v: unknown) => void) => resolve(mkResult()),
      };

      const withJoin = (joinTable: unknown) => {
        const joinTableName = getTableName(joinTable);
        if (tableName === "skill_resource" && joinTableName === "skill") {
          const resourceRows = getStore("skill_resource") as Record<string, unknown>[];
          const skillRows = getStore("skill") as Record<string, unknown>[];

          joinedRows = resourceRows.flatMap((resourceRow) => {
            const matched = skillRows.filter((skillRow) => skillRow.id === resourceRow.skillId);
            return matched.map((skillRow) => ({ ...skillRow, ...resourceRow }));
          });
        } else {
          joinedRows = getRows();
        }

        return {
          where: (condition?: Condition) => {
            whereCondition = condition;
            return afterWhere;
          },
          orderBy: orderByResult,
          limit: limitResult,
          execute: () => Promise.resolve(mkResult()),
          then: (resolve: (v: unknown) => void) => resolve(mkResult()),
        };
      };

      return {
        where: (condition?: Condition) => {
          whereCondition = condition;
          return afterWhere;
        },
        innerJoin: (joinTable: unknown, _condition: unknown) => withJoin(joinTable),
        orderBy: orderByResult,
        limit: limitResult,
        execute: () => Promise.resolve(mkResult()),
        then: (resolve: (v: unknown) => void) => resolve(mkResult()),
      };
    },
  };
}

const mockDb = {
  select: (fieldMap?: Record<string, unknown>) => makeFullSelectChain(fieldMap),

  insert: (table: unknown) => {
    const tableName = getTableName(table);
    return {
      values: (vals: Record<string, unknown> | Record<string, unknown>[]) => {
        const rows = Array.isArray(vals) ? vals : [vals];
        const store = getStore(tableName);
        const created: Record<string, unknown>[] = [];
        for (const v of rows) {
          const now = new Date();
          const row: Record<string, unknown> = {
            id: randomUUID(),
            createdAt: now,
            updatedAt: now,
            ...v,
          };
          if (tableName === "skill" && row.isDefault === undefined) {
            row.isDefault = false;
          }
          store.push(row);
          created.push(row);
        }
        return {
          returning: () => Promise.resolve(created),
          execute: () => Promise.resolve(created),
          then: (resolve: (v: unknown) => void) => resolve(undefined),
        };
      },
    };
  },

  update: (table: unknown) => {
    const tableName = getTableName(table);
    return {
      set: (updates: Record<string, unknown>) => ({
        where: (condition?: Condition) => {
          const store = getStore(tableName);
          const updated: Record<string, unknown>[] = [];
          for (const row of store) {
            if (!condition || evalCondition(row, condition)) {
              Object.assign(row, updates, { updatedAt: new Date() });
              updated.push(row);
            }
          }
          return {
            returning: () => Promise.resolve(updated),
            then: (resolve: (v: unknown) => void) => resolve(undefined),
          };
        },
      }),
    };
  },

  delete: (table: unknown) => {
    const tableName = getTableName(table);
    return {
      where: (condition?: Condition) => {
        const runDelete = () => {
          const store = getStore(tableName);
          const toKeep: Record<string, unknown>[] = [];
          for (const row of store) {
            if (condition && !evalCondition(row, condition)) {
              toKeep.push(row);
            }
          }
          store.length = 0;
          store.push(...toKeep);
        };

        return {
          execute: () => {
            runDelete();
            return Promise.resolve();
          },
          then: (resolve: (v: unknown) => void) => {
            runDelete();
            resolve(undefined);
          },
        };
      },
    };
  },
};

mock.module("@better-skills/db", () => ({ db: mockDb }));

mock.module("@better-skills/db/schema/skills", () => ({
  skill: fakeSkill,
  skillResource: fakeSkillResource,
  skillLink: fakeSkillLink,
  skillResourceKindEnum: {},
  skillRelations: {},
  skillResourceRelations: {},
  skillLinkRelations: {},
}));

// mock auth (used by context.ts)
mock.module("@better-skills/auth", () => ({
  auth: {
    api: {
      getSession: async () => null,
    },
  },
}));

// -- import router + tRPC infra (after all mocks) --

const { t } = await import("../index");
const { appRouter } = await import("./index");

const createCaller = t.createCallerFactory(appRouter);

// -- helpers --

const USER_A = "user-aaa-111";
const USER_B = "user-bbb-222";

function authedCaller(userId: string) {
  return createCaller({ session: { user: { id: userId } } as never });
}

function anonCaller() {
  return createCaller({ session: null } as never);
}

function seedSkill(overrides: Partial<SkillRow> = {}): SkillRow {
  const now = new Date();
  const row: SkillRow = {
    id: randomUUID(),
    ownerUserId: USER_A,
    slug: `skill-${randomUUID().slice(0, 8)}`,
    name: "Test Skill",
    description: "A test skill",
    skillMarkdown: "# Test\nSome content",
    frontmatter: {},
    metadata: {},
    isDefault: false,
    sourceUrl: null,
    sourceIdentifier: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  skills.push(row);
  return row;
}

function seedResource(skillId: string, overrides: Partial<ResourceRow> = {}): ResourceRow {
  const now = new Date();
  const row: ResourceRow = {
    id: randomUUID(),
    skillId,
    path: `ref/${randomUUID().slice(0, 8)}.ts`,
    kind: "reference",
    content: "resource content",
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  resources.push(row);
  return row;
}

function seedLink(overrides: Partial<LinkRow> = {}): LinkRow {
  const row: LinkRow = {
    id: randomUUID(),
    sourceSkillId: null,
    sourceResourceId: null,
    targetSkillId: null,
    targetResourceId: null,
    kind: "related",
    note: null,
    metadata: {},
    createdByUserId: null,
    createdAt: new Date(),
    ...overrides,
  };
  links.push(row);
  return row;
}

beforeEach(() => {
  skills.length = 0;
  resources.length = 0;
  links.length = 0;
});

// ============================================================
// LIST — owner + search
// ============================================================

describe("skills.list", () => {
  test("unauthenticated list returns UNAUTHORIZED", async () => {
    await expect(anonCaller().skills.list({})).rejects.toThrow();
  });

  test("authenticated list returns only caller vault skills", async () => {
    seedSkill({ ownerUserId: USER_A, name: "My Skill" });
    seedSkill({ ownerUserId: USER_A, name: "Another Skill" });
    seedSkill({ ownerUserId: USER_B, name: "Other User Skill" });

    const result = await authedCaller(USER_A).skills.list({});
    const names = result.items.map((i) => i.name);
    expect(names).toContain("My Skill");
    expect(names).toContain("Another Skill");
    expect(names).not.toContain("Other User Skill");
  });

  test("search filters by name", async () => {
    seedSkill({
      ownerUserId: USER_A,
      name: "TypeScript Basics",
      slug: "ts-basics",
    });
    seedSkill({
      ownerUserId: USER_A,
      name: "React Patterns",
      slug: "react-patterns",
    });

    const result = await authedCaller(USER_A).skills.list({ search: "TypeScript" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.name).toBe("TypeScript Basics");
  });

  test("cursor pagination follows createdAt desc order", async () => {
    const oldest = new Date("2026-01-01T00:00:01.000Z");
    const middle = new Date("2026-01-01T00:00:02.000Z");
    const newest = new Date("2026-01-01T00:00:03.000Z");

    seedSkill({
      ownerUserId: USER_A,
      name: "Oldest",
      createdAt: oldest,
      updatedAt: oldest,
    });
    seedSkill({
      ownerUserId: USER_A,
      name: "Middle",
      createdAt: middle,
      updatedAt: middle,
    });
    seedSkill({
      ownerUserId: USER_A,
      name: "Newest",
      createdAt: newest,
      updatedAt: newest,
    });

    const pageOne = await authedCaller(USER_A).skills.list({ limit: 2 });
    expect(pageOne.items.map((item) => item.name)).toEqual(["Newest", "Middle"]);
    expect(pageOne.nextCursor).toBe(pageOne.items[1]!.id);

    const pageTwo = await authedCaller(USER_A).skills.list({
      limit: 2,
      cursor: pageOne.nextCursor!,
    });
    expect(pageTwo.items.map((item) => item.name)).toEqual(["Oldest"]);
    expect(pageTwo.nextCursor).toBeNull();
  });

  test("invalid cursor returns BAD_REQUEST", async () => {
    try {
      await authedCaller(USER_A).skills.list({ cursor: randomUUID() });
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("BAD_REQUEST");
    }
  });

  test("list items exclude markdown and resources", async () => {
    seedSkill({ ownerUserId: USER_A });

    const result = await authedCaller(USER_A).skills.list({});
    const item = result.items[0]!;
    expect(item).not.toHaveProperty("originalMarkdown");
    expect(item).not.toHaveProperty("renderedMarkdown");
    expect(item).not.toHaveProperty("resources");
  });
});

// ============================================================
// GET BY ID — ownership + content
// ============================================================

describe("skills.getById", () => {
  test("unauthenticated caller gets UNAUTHORIZED", async () => {
    const s = seedSkill({ ownerUserId: USER_A });
    await expect(anonCaller().skills.getById({ id: s.id })).rejects.toThrow();
  });

  test("owner can fetch skill", async () => {
    const s = seedSkill({ ownerUserId: USER_A });

    const result = await authedCaller(USER_A).skills.getById({ id: s.id });
    expect(result.id).toBe(s.id);
    expect(result.originalMarkdown).toBe(s.skillMarkdown);
    expect(result.renderedMarkdown).toBeDefined();
  });

  test("non-owner gets NOT_FOUND", async () => {
    const s = seedSkill({ ownerUserId: USER_A });

    try {
      await authedCaller(USER_B).skills.getById({ id: s.id });
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("NOT_FOUND");
    }
  });

  test("missing id returns NOT_FOUND", async () => {
    expect(authedCaller(USER_A).skills.getById({ id: randomUUID() })).rejects.toThrow();
  });

  test("includes resources in response", async () => {
    const s = seedSkill({ ownerUserId: USER_A });
    seedResource(s.id, { path: "readme.md", content: "hello" });

    const result = await authedCaller(USER_A).skills.getById({ id: s.id });
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0]!.path).toBe("readme.md");
  });

  test("returns both originalMarkdown and renderedMarkdown", async () => {
    const s = seedSkill({
      ownerUserId: USER_A,
      skillMarkdown: "plain text no mentions",
    });

    const result = await authedCaller(USER_A).skills.getById({ id: s.id });
    expect(result.originalMarkdown).toBe("plain text no mentions");
    expect(result.renderedMarkdown).toBe("plain text no mentions");
  });
});

// ============================================================
// GET BY SLUG
// ============================================================

describe("skills.getBySlug", () => {
  test("unauthenticated caller gets UNAUTHORIZED", async () => {
    seedSkill({ ownerUserId: USER_A, slug: "my-skill" });
    await expect(anonCaller().skills.getBySlug({ slug: "my-skill" })).rejects.toThrow();
  });

  test("owner can fetch skill by slug", async () => {
    seedSkill({ ownerUserId: USER_A, slug: "private-slug" });

    const result = await authedCaller(USER_A).skills.getBySlug({ slug: "private-slug" });
    expect(result.slug).toBe("private-slug");
  });

  test("non-owner cannot fetch skill by slug", async () => {
    seedSkill({ ownerUserId: USER_A, slug: "private-slug-2" });
    expect(authedCaller(USER_B).skills.getBySlug({ slug: "private-slug-2" })).rejects.toThrow();
  });

  test("missing slug returns NOT_FOUND", async () => {
    expect(authedCaller(USER_A).skills.getBySlug({ slug: "nonexistent" })).rejects.toThrow();
  });
});

// ============================================================
// GET RESOURCE BY PATH
// ============================================================

describe("skills.getResourceByPath", () => {
  test("owner can access resource by slug/path", async () => {
    const s = seedSkill({ ownerUserId: USER_A, slug: "my-skill" });
    seedResource(s.id, { path: "lib/utils.ts", content: "export const x = 1;" });

    const result = await authedCaller(USER_A).skills.getResourceByPath({
      skillSlug: "my-skill",
      resourcePath: "lib/utils.ts",
    });
    expect(result.path).toBe("lib/utils.ts");
    expect(result.content).toBe("export const x = 1;");
    expect(result.skillSlug).toBe("my-skill");
    expect(result.skillName).toBe(s.name);
  });

  test("unauthenticated access returns UNAUTHORIZED", async () => {
    const s = seedSkill({ ownerUserId: USER_A, slug: "private-only" });
    seedResource(s.id, { path: "secret.ts" });

    await expect(
      anonCaller().skills.getResourceByPath({
        skillSlug: "private-only",
        resourcePath: "secret.ts",
      }),
    ).rejects.toThrow();
  });

  test("resource fails for non-owner", async () => {
    const s = seedSkill({ ownerUserId: USER_A, slug: "priv-skill" });
    seedResource(s.id, { path: "secret.ts" });

    expect(
      authedCaller(USER_B).skills.getResourceByPath({
        skillSlug: "priv-skill",
        resourcePath: "secret.ts",
      }),
    ).rejects.toThrow();
  });

  test("owner can access resource", async () => {
    const s = seedSkill({ ownerUserId: USER_A, slug: "my-priv" });
    seedResource(s.id, { path: "impl.ts", content: "private stuff" });

    const result = await authedCaller(USER_A).skills.getResourceByPath({
      skillSlug: "my-priv",
      resourcePath: "impl.ts",
    });
    expect(result.content).toBe("private stuff");
  });

  test("missing resource path returns NOT_FOUND", async () => {
    const s = seedSkill({ ownerUserId: USER_A, slug: "exists" });
    seedResource(s.id, { path: "real.ts" });

    expect(
      authedCaller(USER_A).skills.getResourceByPath({
        skillSlug: "exists",
        resourcePath: "nonexistent.ts",
      }),
    ).rejects.toThrow();
  });

  test("returns renderedContent with mention links", async () => {
    const s = seedSkill({ ownerUserId: USER_A, slug: "with-mentions" });
    const target = seedResource(s.id, { path: "references/guidelines.md" });
    seedResource(s.id, {
      path: "references/flow.md",
      content: `Read [[resource:${target.id}]]`,
    });

    const result = await authedCaller(USER_A).skills.getResourceByPath({
      skillSlug: "with-mentions",
      resourcePath: "references/flow.md",
    });

    expect(result.content).toBe(`Read [[resource:${target.id}]]`);
    expect(result.renderedContent).toContain(
      `/vault/skills/${s.id}/resources/references/guidelines.md?mention=resource%3A${target.id}`,
    );
  });
});

describe("skills.getResourceBySkillIdAndPath", () => {
  test("returns renderedContent with mention links", async () => {
    const s = seedSkill({ ownerUserId: USER_A });
    const target = seedResource(s.id, { path: "references/checklist.md" });
    seedResource(s.id, {
      path: "references/create.md",
      content: `See [[resource:${target.id}]]`,
    });

    const result = await authedCaller(USER_A).skills.getResourceBySkillIdAndPath({
      skillId: s.id,
      resourcePath: "references/create.md",
    });

    expect(result.content).toBe(`See [[resource:${target.id}]]`);
    expect(result.renderedContent).toContain(
      `/vault/skills/${s.id}/resources/references/checklist.md?mention=resource%3A${target.id}`,
    );
  });
});

// ============================================================
// CREATE — auth + defaults
// ============================================================

describe("skills.create", () => {
  test("unauthenticated create returns UNAUTHORIZED", async () => {
    try {
      await anonCaller().skills.create({
        slug: "new",
        name: "New",
        description: "desc",
        skillMarkdown: "# New",
      });
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("UNAUTHORIZED");
    }
  });

  test("created skill stores authenticated user as owner", async () => {
    const result = await authedCaller(USER_A).skills.create({
      slug: "mine",
      name: "Mine",
      description: "my skill",
      skillMarkdown: "# Mine",
    });
    expect(result.ownerUserId).toBe(USER_A);
  });

  test("create keeps owner on created skill", async () => {
    const result = await authedCaller(USER_A).skills.create({
      slug: "default-vis",
      name: "Default",
      description: "testing default",
      skillMarkdown: "# D",
    });
    expect(result.ownerUserId).toBe(USER_A);
  });

  test("create persists nested resources", async () => {
    const result = await authedCaller(USER_A).skills.create({
      slug: "with-res",
      name: "With Resources",
      description: "has resources",
      skillMarkdown: "# R",
      resources: [
        { path: "readme.md", content: "# Readme" },
        { path: "lib/helper.ts", kind: "script", content: "export default 1;" },
      ],
    });
    expect(result.resources).toHaveLength(2);
    expect(result.resources.map((r) => r.path).sort()).toEqual(["lib/helper.ts", "readme.md"]);
  });

  test("create keeps local markdown links as-is", async () => {
    const result = await authedCaller(USER_A).skills.create({
      slug: "local-resource-links",
      name: "Local Resource Links",
      description: "preserve markdown links",
      skillMarkdown: "See [Guide](references/guide.md)",
      resources: [{ path: "references/guide.md", content: "# Guide" }],
    });

    expect(result.originalMarkdown).toBe("See [Guide](references/guide.md)");

    const autoLinks = links.filter(
      (link) =>
        link.sourceSkillId === result.id &&
        (link.metadata as Record<string, unknown>).origin === "markdown-auto",
    );
    expect(autoLinks).toHaveLength(0);
  });

  test("create rejects non-uuid mention tokens", async () => {
    try {
      await authedCaller(USER_A).skills.create({
        slug: "bad-mention-token",
        name: "Bad Mention Token",
        description: "should fail",
        skillMarkdown: "See [[resource:references/missing.md]]",
      });
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("BAD_REQUEST");
    }

    expect(skills).toHaveLength(0);
  });

  test("create rejects missing mention targets instead of skipping", async () => {
    const unknownSkill = randomUUID();

    try {
      await authedCaller(USER_A).skills.create({
        slug: "missing-target",
        name: "Missing Target",
        description: "should fail",
        skillMarkdown: `See [[skill:${unknownSkill}]]`,
      });
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("BAD_REQUEST");
    }

    expect(skills).toHaveLength(0);
  });

  test("create returns both originalMarkdown and renderedMarkdown", async () => {
    const result = await authedCaller(USER_A).skills.create({
      slug: "md",
      name: "MD",
      description: "testing markdown",
      skillMarkdown: "just plain text",
    });
    expect(result.originalMarkdown).toBe("just plain text");
    expect(result.renderedMarkdown).toBeDefined();
  });
});

// ============================================================
// UPDATE — ownership + field persistence
// ============================================================

describe("skills.update", () => {
  test("non-owner update returns FORBIDDEN", async () => {
    const s = seedSkill({ ownerUserId: USER_A });

    try {
      await authedCaller(USER_B).skills.update({ id: s.id, name: "Hacked" });
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("FORBIDDEN");
    }
  });

  test("owner can update skill fields", async () => {
    const s = seedSkill({ ownerUserId: USER_A, name: "Original" });

    const result = await authedCaller(USER_A).skills.update({ id: s.id, name: "Updated Name" });
    expect(result.name).toBe("Updated Name");
  });

  test("default skills are read-only", async () => {
    const s = seedSkill({ ownerUserId: USER_A, isDefault: true });

    try {
      await authedCaller(USER_A).skills.update({ id: s.id, name: "Nope" });
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("FORBIDDEN");
    }
  });

  test("update rejects non-uuid resource mention tokens", async () => {
    const source = seedSkill({ ownerUserId: USER_A, skillMarkdown: "# Start" });

    try {
      await authedCaller(USER_A).skills.update({
        id: source.id,
        skillMarkdown: "See [[resource:references/new-guide.md]]",
        resources: [{ path: "references/new-guide.md", content: "new guide" }],
      });
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("BAD_REQUEST");
    }

    const persisted = skills.find((row) => row.id === source.id);
    expect(persisted?.skillMarkdown).toBe("# Start");
  });

  test("update rejects invalid mention targets before persisting markdown", async () => {
    const source = seedSkill({ ownerUserId: USER_A, skillMarkdown: "# Original" });
    const unknownSkill = randomUUID();

    try {
      await authedCaller(USER_A).skills.update({
        id: source.id,
        skillMarkdown: `See [[skill:${unknownSkill}]]`,
      });
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("BAD_REQUEST");
    }

    const persisted = skills.find((row) => row.id === source.id);
    expect(persisted?.skillMarkdown).toBe("# Original");
  });

  test("update nonexistent skill returns NOT_FOUND", async () => {
    try {
      await authedCaller(USER_A).skills.update({ id: randomUUID(), name: "Nope" });
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("NOT_FOUND");
    }
  });

  test("unauthenticated update returns UNAUTHORIZED", async () => {
    const s = seedSkill({ ownerUserId: USER_A });

    try {
      await anonCaller().skills.update({ id: s.id, name: "Hacked" });
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("UNAUTHORIZED");
    }
  });
});

// ============================================================
// DELETE — ownership + cascade
// ============================================================

describe("skills.delete", () => {
  test("non-owner delete returns FORBIDDEN", async () => {
    const s = seedSkill({ ownerUserId: USER_A });

    try {
      await authedCaller(USER_B).skills.delete({ id: s.id });
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("FORBIDDEN");
    }
  });

  test("owner can delete skill", async () => {
    const s = seedSkill({ ownerUserId: USER_A });
    seedResource(s.id);

    const result = await authedCaller(USER_A).skills.delete({ id: s.id });
    expect(result.success).toBe(true);
    expect(skills.find((sk) => sk.id === s.id)).toBeUndefined();
  });

  test("default skills cannot be deleted", async () => {
    const s = seedSkill({ ownerUserId: USER_A, isDefault: true });

    try {
      await authedCaller(USER_A).skills.delete({ id: s.id });
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("FORBIDDEN");
    }
  });

  test("delete nonexistent skill returns NOT_FOUND", async () => {
    try {
      await authedCaller(USER_A).skills.delete({ id: randomUUID() });
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("NOT_FOUND");
    }
  });

  test("unauthenticated delete returns UNAUTHORIZED", async () => {
    const s = seedSkill({ ownerUserId: USER_A });

    try {
      await anonCaller().skills.delete({ id: s.id });
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("UNAUTHORIZED");
    }
  });
});

// ============================================================
// RENDERING — originalMarkdown + renderedMarkdown coexist
// ============================================================

describe("rendering", () => {
  test("get response has both markdown fields for plain text", async () => {
    const s = seedSkill({
      ownerUserId: USER_A,
      skillMarkdown: "# Hello World",
    });

    const result = await authedCaller(USER_A).skills.getById({ id: s.id });
    expect(result.originalMarkdown).toBe("# Hello World");
    expect(result.renderedMarkdown).toBe("# Hello World");
  });

  test("get response renders skill mentions to backticked skill name", async () => {
    const target = seedSkill({ ownerUserId: USER_A, name: "Target Skill" });
    const source = seedSkill({
      ownerUserId: USER_A,
      skillMarkdown: `See [[skill:${target.id}]] for more`,
    });

    const result = await authedCaller(USER_A).skills.getById({ id: source.id });
    expect(result.originalMarkdown).toContain(`[[skill:${target.id}]]`);
    expect(result.renderedMarkdown).toContain(`\`${target.name}\``);
  });

  test("get response renders resource mentions", async () => {
    const parent = seedSkill({ ownerUserId: USER_A, name: "Parent Skill" });
    const res = seedResource(parent.id, { path: "helpers/util.ts" });
    const source = seedSkill({
      ownerUserId: USER_A,
      skillMarkdown: `Check [[resource:${res.id}]]`,
    });

    const result = await authedCaller(USER_A).skills.getById({ id: source.id });
    expect(result.renderedMarkdown).toContain("`helpers/util.ts for Parent Skill`");
  });

  test("get response can render mention links for web", async () => {
    const target = seedSkill({ ownerUserId: USER_A, name: "Target Skill" });
    const source = seedSkill({
      ownerUserId: USER_A,
      skillMarkdown: `See [[skill:${target.id}]]`,
    });

    const result = await authedCaller(USER_A).skills.getById({ id: source.id, linkMentions: true });

    expect(result.renderedMarkdown).toContain(
      `/vault/skills/${target.id}?mention=skill%3A${target.id}`,
    );
  });

  test("unknown mentions resolve to fallback text", async () => {
    const unknownId = randomUUID();
    const s = seedSkill({
      ownerUserId: USER_A,
      skillMarkdown: `See [[skill:${unknownId}]]`,
    });

    const result = await authedCaller(USER_A).skills.getById({ id: s.id });
    expect(result.renderedMarkdown).toContain("`(unknown skill)`");
  });
});

// ============================================================
// GRAPH — link shapes
// ============================================================

describe("graph links", () => {
  test("graphForSkill includes skill/resource link combinations", async () => {
    const skillA = seedSkill({ ownerUserId: USER_A, name: "A" });
    const skillB = seedSkill({ ownerUserId: USER_A, name: "B" });
    const resourceA = seedResource(skillA.id, { path: "references/a.md" });
    const resourceB = seedResource(skillB.id, { path: "references/b.md" });

    const skillToSkill = seedLink({ sourceSkillId: skillA.id, targetSkillId: skillB.id });
    const skillToResource = seedLink({ sourceSkillId: skillA.id, targetResourceId: resourceB.id });
    const resourceToSkill = seedLink({ sourceResourceId: resourceA.id, targetSkillId: skillB.id });
    const resourceToResource = seedLink({
      sourceResourceId: resourceA.id,
      targetResourceId: resourceB.id,
    });

    const result = await authedCaller(USER_A).skills.graphForSkill({ skillId: skillA.id });

    const nodeIds = new Set(result.nodes.map((node) => node.id));
    expect(nodeIds.has(skillA.id)).toBe(true);
    expect(nodeIds.has(skillB.id)).toBe(true);
    expect(nodeIds.has(resourceA.id)).toBe(true);
    expect(nodeIds.has(resourceB.id)).toBe(true);

    const edgeIds = new Set(result.edges.map((edge) => edge.id));
    expect(edgeIds.has(skillToSkill.id)).toBe(true);
    expect(edgeIds.has(skillToResource.id)).toBe(true);
    expect(edgeIds.has(resourceToSkill.id)).toBe(true);
    expect(edgeIds.has(resourceToResource.id)).toBe(true);
  });

  test("graph includes skill/resource link combinations for caller vault", async () => {
    const skillA = seedSkill({ ownerUserId: USER_A, name: "A" });
    const skillB = seedSkill({ ownerUserId: USER_A, name: "B" });
    const resourceA = seedResource(skillA.id, { path: "references/a.md" });
    const resourceB = seedResource(skillB.id, { path: "references/b.md" });

    const skillToSkill = seedLink({ sourceSkillId: skillA.id, targetSkillId: skillB.id });
    const skillToResource = seedLink({ sourceSkillId: skillA.id, targetResourceId: resourceB.id });
    const resourceToSkill = seedLink({ sourceResourceId: resourceA.id, targetSkillId: skillB.id });
    const resourceToResource = seedLink({
      sourceResourceId: resourceA.id,
      targetResourceId: resourceB.id,
    });

    const result = await authedCaller(USER_A).skills.graph();
    const edgeIds = new Set(result.edges.map((edge) => edge.id));

    expect(edgeIds.has(skillToSkill.id)).toBe(true);
    expect(edgeIds.has(skillToResource.id)).toBe(true);
    expect(edgeIds.has(resourceToSkill.id)).toBe(true);
    expect(edgeIds.has(resourceToResource.id)).toBe(true);
  });
});

// ============================================================
// LINK AUTO-SYNC
// ============================================================

describe("link auto-sync", () => {
  test("create with mentions generates auto links", async () => {
    const target = seedSkill({ ownerUserId: USER_A, name: "Link Target" });

    await authedCaller(USER_A).skills.create({
      slug: "linker",
      name: "Linker",
      description: "links",
      skillMarkdown: `See [[skill:${target.id}]]`,
    });

    const autoLinks = links.filter(
      (l) =>
        l.targetSkillId === target.id &&
        (l.metadata as Record<string, unknown>).origin === "markdown-auto",
    );
    expect(autoLinks).toHaveLength(1);
  });

  test("update markdown refreshes auto links", async () => {
    const targetA = seedSkill({ ownerUserId: USER_A, name: "Target A" });
    const targetB = seedSkill({ ownerUserId: USER_A, name: "Target B" });
    const source = seedSkill({
      ownerUserId: USER_A,
      skillMarkdown: `See [[skill:${targetA.id}]]`,
    });

    seedLink({
      sourceSkillId: source.id,
      targetSkillId: targetA.id,
      metadata: { origin: "markdown-auto" },
      createdByUserId: USER_A,
    });

    await authedCaller(USER_A).skills.update({
      id: source.id,
      skillMarkdown: `Now see [[skill:${targetB.id}]]`,
    });

    const linksToA = links.filter(
      (l) =>
        l.targetSkillId === targetA.id &&
        (l.metadata as Record<string, unknown>).origin === "markdown-auto",
    );
    const linksToB = links.filter(
      (l) =>
        l.targetSkillId === targetB.id &&
        (l.metadata as Record<string, unknown>).origin === "markdown-auto",
    );
    expect(linksToA).toHaveLength(0);
    expect(linksToB).toHaveLength(1);
  });

  test("manual links remain after auto-sync refresh", async () => {
    const target = seedSkill({ ownerUserId: USER_A, name: "Target" });
    const source = seedSkill({
      ownerUserId: USER_A,
      skillMarkdown: "no mentions",
    });

    seedLink({
      sourceSkillId: source.id,
      targetSkillId: target.id,
      kind: "related",
      metadata: {},
      createdByUserId: USER_A,
    });

    await authedCaller(USER_A).skills.update({
      id: source.id,
      skillMarkdown: "still no mentions",
    });

    const manualLinks = links.filter(
      (l) => l.sourceSkillId === source.id && l.targetSkillId === target.id,
    );
    expect(manualLinks).toHaveLength(1);
  });

  test("create syncs auto links for resource markdown", async () => {
    const targetSkill = seedSkill({ ownerUserId: USER_A });
    const targetResource = seedResource(targetSkill.id, { path: "references/target.md" });

    const created = await authedCaller(USER_A).skills.create({
      slug: "resource-source-create",
      name: "Resource Source Create",
      description: "resource link source",
      skillMarkdown: "# skill",
      resources: [
        {
          path: "references/source.md",
          content: `See [[skill:${targetSkill.id}]] and [[resource:${targetResource.id}]]`,
        },
      ],
    });

    const sourceResource = created.resources.find(
      (resource) => resource.path === "references/source.md",
    );
    expect(sourceResource).toBeDefined();
    if (!sourceResource) return;

    const autoLinks = links.filter(
      (link) =>
        link.sourceResourceId === sourceResource.id &&
        (link.metadata as Record<string, unknown>).origin === "markdown-auto",
    );

    expect(autoLinks.some((link) => link.targetSkillId === targetSkill.id)).toBe(true);
    expect(autoLinks.some((link) => link.targetResourceId === targetResource.id)).toBe(true);
  });

  test("update resource markdown refreshes resource auto links", async () => {
    const targetSkill = seedSkill({ ownerUserId: USER_A });
    const targetResourceA = seedResource(targetSkill.id, { path: "references/target-a.md" });
    const targetResourceB = seedResource(targetSkill.id, { path: "references/target-b.md" });
    const sourceSkill = seedSkill({ ownerUserId: USER_A });
    const sourceResource = seedResource(sourceSkill.id, {
      path: "references/source.md",
      content: `See [[resource:${targetResourceA.id}]]`,
    });

    seedLink({
      sourceResourceId: sourceResource.id,
      targetResourceId: targetResourceA.id,
      kind: "mention",
      metadata: { origin: "markdown-auto" },
      createdByUserId: USER_A,
    });

    await authedCaller(USER_A).skills.update({
      id: sourceSkill.id,
      resources: [
        {
          id: sourceResource.id,
          path: sourceResource.path,
          kind: sourceResource.kind,
          content: `Now [[resource:${targetResourceB.id}]]`,
          metadata: sourceResource.metadata,
        },
      ],
    });

    const linksToA = links.filter(
      (link) =>
        link.sourceResourceId === sourceResource.id &&
        link.targetResourceId === targetResourceA.id &&
        (link.metadata as Record<string, unknown>).origin === "markdown-auto",
    );
    const linksToB = links.filter(
      (link) =>
        link.sourceResourceId === sourceResource.id &&
        link.targetResourceId === targetResourceB.id &&
        (link.metadata as Record<string, unknown>).origin === "markdown-auto",
    );

    expect(linksToA).toHaveLength(0);
    expect(linksToB).toHaveLength(1);
  });
});
