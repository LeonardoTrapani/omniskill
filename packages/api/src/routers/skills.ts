import { TRPCError } from "@trpc/server";
import { and, desc, eq, getTableColumns, gt, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@omniscient/db";
import { skill, skillLink, skillResource } from "@omniscient/db/schema/skills";

import { protectedProcedure, publicProcedure, router } from "../index";
import { syncAutoLinks } from "../lib/link-sync";
import { renderMentions } from "../lib/render-mentions";

// -- shared enums --

const visibilityEnum = z.enum(["public", "private"]);
const resourceKindEnum = z.enum(["reference", "script", "asset", "other"]);

// -- pagination --

const cursorPaginationInput = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

// -- resource schemas --

const resourceOutput = z.object({
  id: z.string().uuid(),
  skillId: z.string().uuid(),
  path: z.string(),
  kind: resourceKindEnum,
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const resourceInput = z.object({
  path: z.string().min(1),
  kind: resourceKindEnum.default("reference"),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

// -- skill output --

const skillOutput = z.object({
  id: z.string().uuid(),
  ownerUserId: z.string().nullable(),
  visibility: visibilityEnum,
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  originalMarkdown: z.string(),
  renderedMarkdown: z.string(),
  frontmatter: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.unknown()),
  sourceUrl: z.string().nullable(),
  sourceIdentifier: z.string().nullable(),
  resources: z.array(resourceOutput),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const skillListItem = skillOutput.omit({
  originalMarkdown: true,
  renderedMarkdown: true,
  resources: true,
});

const paginatedSkillList = z.object({
  items: z.array(skillListItem),
  nextCursor: z.string().uuid().nullable(),
});

// -- helpers --

type Session = { user: { id: string } };

/** visibility filter: public skills + caller's own private skills */
function visibilityFilter(session: Session | null) {
  if (session) {
    return or(
      eq(skill.visibility, "public"),
      and(eq(skill.visibility, "private"), eq(skill.ownerUserId, session.user.id)),
    );
  }
  return eq(skill.visibility, "public");
}

// -- graph helpers --

const graphOutput = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["skill", "resource"]),
      label: z.string(),
      description: z.string().nullable(),
      slug: z.string().nullable(),
      parentSkillId: z.string().nullable(),
      kind: z.string().nullable(),
      contentSnippet: z.string().nullable(),
      updatedAt: z.string().nullable(),
    }),
  ),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      kind: z.string(),
    }),
  ),
});

type GraphEdge = { id: string; source: string; target: string; kind: string };

function buildGraphPayload(
  skills: (typeof skill.$inferSelect)[],
  resources: (typeof skillResource.$inferSelect)[],
  explicitLinks?: (typeof skillLink.$inferSelect)[],
) {
  const nodeIds = new Set([...skills.map((s) => s.id), ...resources.map((r) => r.id)]);

  const nodes = [
    ...skills.map((s) => ({
      id: s.id,
      type: "skill" as const,
      label: s.name,
      description: s.description,
      slug: s.slug,
      parentSkillId: null,
      kind: null,
      contentSnippet: s.skillMarkdown ? s.skillMarkdown.slice(0, 200) : null,
      updatedAt: s.updatedAt.toISOString(),
    })),
    ...resources.map((r) => ({
      id: r.id,
      type: "resource" as const,
      label: r.path,
      description: null,
      slug: null,
      parentSkillId: r.skillId,
      kind: r.kind,
      contentSnippet: r.content ? r.content.slice(0, 200) : null,
      updatedAt: r.updatedAt.toISOString(),
    })),
  ];

  const edges: GraphEdge[] = [];

  if (explicitLinks) {
    for (const link of explicitLinks) {
      const sourceId = link.sourceSkillId ?? link.sourceResourceId;
      const targetId = link.targetSkillId ?? link.targetResourceId;
      if (sourceId && targetId && nodeIds.has(sourceId) && nodeIds.has(targetId)) {
        edges.push({ id: link.id, source: sourceId, target: targetId, kind: link.kind });
      }
    }
  }

  for (const r of resources) {
    edges.push({ id: `parent-${r.id}`, source: r.skillId, target: r.id, kind: "parent" });
  }

  return { nodes, edges };
}

/** map a skill row + resources array to the output shape, rendering mentions */
async function toSkillOutput(
  row: typeof skill.$inferSelect,
  resources: (typeof skillResource.$inferSelect)[],
) {
  const renderedMarkdown = await renderMentions(row.skillMarkdown, row.id);

  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    visibility: row.visibility,
    slug: row.slug,
    name: row.name,
    description: row.description,
    originalMarkdown: row.skillMarkdown,
    renderedMarkdown,
    frontmatter: row.frontmatter,
    metadata: row.metadata,
    sourceUrl: row.sourceUrl,
    sourceIdentifier: row.sourceIdentifier,
    resources,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// -- search helpers --

// strict_word_similarity normalizes by max(|trgm(query)|, |trgm(best_substr)|),
// producing tighter scores than word_similarity which only uses |trgm(query)|.
const FUZZY_THRESHOLD = 0.15;

function extractSnippet(text: string, query: string, contextChars = 80): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, contextChars).replace(/\n/g, " ").trim() + "...";

  const start = Math.max(0, idx - Math.floor(contextChars / 2));
  const end = Math.min(text.length, idx + query.length + Math.floor(contextChars / 2));
  let snippet = text.slice(start, end).replace(/\n/g, " ").trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet += "...";
  return snippet;
}

/**
 * Build the WHERE condition for fuzzy search.
 * Uses strict_word_similarity for >= 3 char queries (typo tolerance),
 * falls back to ILIKE for shorter queries where trigrams don't work well.
 */
function searchCondition(query: string) {
  const pattern = `%${query}%`;

  if (query.length >= 3) {
    return or(
      sql`strict_word_similarity(${query}, ${skill.name}) > ${FUZZY_THRESHOLD}`,
      sql`strict_word_similarity(${query}, ${skill.description}) > ${FUZZY_THRESHOLD}`,
      sql`strict_word_similarity(${query}, ${skill.slug}) > ${FUZZY_THRESHOLD}`,
      ilike(skill.skillMarkdown, pattern),
    );
  }

  return or(
    ilike(skill.name, pattern),
    ilike(skill.description, pattern),
    ilike(skill.skillMarkdown, pattern),
  );
}

// -- search output --

const searchResultItem = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  visibility: visibilityEnum,
  matchType: z.enum(["title", "description", "content"]),
  score: z.number(),
  snippet: z.string().nullable(),
  updatedAt: z.date(),
});

// -- router --

export const skillsRouter = router({
  count: publicProcedure.output(z.object({ count: z.number() })).query(async () => {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(skill)
      .where(eq(skill.visibility, "public"));
    return { count: result?.count ?? 0 };
  }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        scope: z.enum(["own", "all"]).default("own"),
        limit: z.number().int().min(1).max(50).default(5),
      }),
    )
    .output(z.object({ items: z.array(searchResultItem), total: z.number() }))
    .query(async ({ ctx, input }) => {
      const { query, scope, limit } = input;

      if (scope === "own" && !ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required to search own skills",
        });
      }

      const pattern = `%${query}%`;
      const useFuzzy = query.length >= 3;

      const scopeCondition =
        scope === "own"
          ? eq(skill.ownerUserId, ctx.session!.user.id)
          : visibilityFilter(ctx.session);

      const matchCondition = searchCondition(query);
      const whereClause = and(matchCondition, scopeCondition);

      // additive score: trigram similarity base + exact substring bonuses.
      // the ILIKE bonuses ensure "docker" in a description outranks "doc" trigram overlaps.
      const scoreExpr = useFuzzy
        ? sql<number>`LEAST(
            GREATEST(strict_word_similarity(${query}, ${skill.name}), strict_word_similarity(${query}, ${skill.slug}))
            + strict_word_similarity(${query}, ${skill.description}) * 0.3
            + CASE WHEN ${skill.name} ILIKE ${pattern} OR ${skill.slug} ILIKE ${pattern} THEN 0.5
                   WHEN ${skill.description} ILIKE ${pattern} THEN 0.2
                   WHEN ${skill.skillMarkdown} ILIKE ${pattern} THEN 0.05
                   ELSE 0 END,
            1.0)`
        : sql<number>`CASE
            WHEN ${skill.name} ILIKE ${pattern} THEN 1.0
            WHEN ${skill.description} ILIKE ${pattern} THEN 0.8
            WHEN ${skill.skillMarkdown} ILIKE ${pattern} THEN 0.5
            ELSE 0
          END`;

      const [rows, countResult] = await Promise.all([
        db
          .select({
            ...getTableColumns(skill),
            score: scoreExpr.as("score"),
            nameScore: useFuzzy
              ? sql<number>`strict_word_similarity(${query}, ${skill.name})`.as("name_score")
              : sql<number>`CASE WHEN ${skill.name} ILIKE ${pattern} THEN 1.0 ELSE 0 END`.as(
                  "name_score",
                ),
            descScore: useFuzzy
              ? sql<number>`strict_word_similarity(${query}, ${skill.description})`.as("desc_score")
              : sql<number>`CASE WHEN ${skill.description} ILIKE ${pattern} THEN 1.0 ELSE 0 END`.as(
                  "desc_score",
                ),
            contentMatch: sql<boolean>`${skill.skillMarkdown} ILIKE ${pattern}`.as("content_match"),
          })
          .from(skill)
          .where(whereClause)
          .orderBy(sql`score DESC`, skill.name)
          .limit(limit),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(skill)
          .where(whereClause),
      ]);

      const total = countResult[0]?.count ?? 0;

      const items = rows.map((row) => {
        const matchType: "title" | "description" | "content" =
          row.nameScore >= row.descScore && row.nameScore > 0.1
            ? "title"
            : row.descScore > 0.1
              ? "description"
              : "content";

        const snippet =
          matchType === "content" && row.contentMatch
            ? extractSnippet(row.skillMarkdown, query)
            : null;

        return {
          id: row.id,
          slug: row.slug,
          name: row.name,
          description: row.description,
          visibility: row.visibility,
          matchType,
          score: Math.round(row.score * 100) / 100,
          snippet,
          updatedAt: row.updatedAt,
        };
      });

      return { items, total };
    }),

  list: publicProcedure
    .input(
      cursorPaginationInput.extend({
        search: z.string().optional(),
        visibility: visibilityEnum.optional(),
      }),
    )
    .output(paginatedSkillList)
    .query(async ({ ctx, input }) => {
      const { cursor, limit, search, visibility } = input;

      const conditions = [visibilityFilter(ctx.session)];

      if (search) {
        const pattern = `%${search}%`;
        conditions.push(or(ilike(skill.name, pattern), ilike(skill.slug, pattern))!);
      }

      if (visibility) {
        conditions.push(eq(skill.visibility, visibility));
      }

      if (cursor) {
        const cursorRows = await db
          .select({ id: skill.id, createdAt: skill.createdAt })
          .from(skill)
          .where(and(eq(skill.id, cursor), ...conditions));

        const cursorRow = cursorRows[0];
        if (!cursorRow) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid cursor" });
        }

        conditions.push(
          or(
            lt(skill.createdAt, cursorRow.createdAt),
            and(eq(skill.createdAt, cursorRow.createdAt), gt(skill.id, cursorRow.id)),
          )!,
        );
      }

      const rows = await db
        .select()
        .from(skill)
        .where(and(...conditions))
        .orderBy(desc(skill.createdAt), skill.id)
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      return {
        items: items.map((row) => ({
          id: row.id,
          ownerUserId: row.ownerUserId,
          visibility: row.visibility,
          slug: row.slug,
          name: row.name,
          description: row.description,
          frontmatter: row.frontmatter,
          metadata: row.metadata,
          sourceUrl: row.sourceUrl,
          sourceIdentifier: row.sourceIdentifier,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        })),
        nextCursor: hasMore ? items[items.length - 1]!.id : null,
      };
    }),

  listByOwner: protectedProcedure
    .input(
      cursorPaginationInput.extend({
        search: z.string().optional(),
      }),
    )
    .output(paginatedSkillList)
    .query(async ({ ctx, input }) => {
      const { cursor, limit, search } = input;
      const userId = ctx.session.user.id;

      const conditions = [eq(skill.ownerUserId, userId)];

      if (search) {
        const pattern = `%${search}%`;
        conditions.push(or(ilike(skill.name, pattern), ilike(skill.slug, pattern))!);
      }

      if (cursor) {
        const cursorRows = await db
          .select({ id: skill.id, createdAt: skill.createdAt })
          .from(skill)
          .where(and(eq(skill.id, cursor), ...conditions));

        const cursorRow = cursorRows[0];
        if (!cursorRow) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid cursor" });
        }

        conditions.push(
          or(
            lt(skill.createdAt, cursorRow.createdAt),
            and(eq(skill.createdAt, cursorRow.createdAt), gt(skill.id, cursorRow.id)),
          )!,
        );
      }

      const rows = await db
        .select()
        .from(skill)
        .where(and(...conditions))
        .orderBy(desc(skill.createdAt), skill.id)
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      return {
        items: items.map((row) => ({
          id: row.id,
          ownerUserId: row.ownerUserId,
          visibility: row.visibility,
          slug: row.slug,
          name: row.name,
          description: row.description,
          frontmatter: row.frontmatter,
          metadata: row.metadata,
          sourceUrl: row.sourceUrl,
          sourceIdentifier: row.sourceIdentifier,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        })),
        nextCursor: hasMore ? items[items.length - 1]!.id : null,
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(skillOutput)
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select()
        .from(skill)
        .where(and(eq(skill.id, input.id), visibilityFilter(ctx.session)));

      const row = rows[0];
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Skill not found" });
      }

      const resources = await db
        .select()
        .from(skillResource)
        .where(eq(skillResource.skillId, row.id));

      return await toSkillOutput(row, resources);
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .output(skillOutput)
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select()
        .from(skill)
        .where(and(eq(skill.slug, input.slug), visibilityFilter(ctx.session)));

      const row = rows[0];
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Skill not found" });
      }

      const resources = await db
        .select()
        .from(skillResource)
        .where(eq(skillResource.skillId, row.id));

      return await toSkillOutput(row, resources);
    }),

  getResourceByPath: publicProcedure
    .input(
      z.object({
        skillSlug: z.string().min(1),
        resourcePath: z.string().min(1),
      }),
    )
    .output(
      resourceOutput.extend({
        skillId: z.string().uuid(),
        skillSlug: z.string(),
        skillName: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skillRows = await db
        .select()
        .from(skill)
        .where(and(eq(skill.slug, input.skillSlug), visibilityFilter(ctx.session)));

      const skillRow = skillRows[0];
      if (!skillRow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Skill not found" });
      }

      const resourceRows = await db
        .select()
        .from(skillResource)
        .where(
          and(eq(skillResource.skillId, skillRow.id), eq(skillResource.path, input.resourcePath)),
        );

      const resource = resourceRows[0];
      if (!resource) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found" });
      }

      return {
        ...resource,
        skillId: skillRow.id,
        skillSlug: skillRow.slug,
        skillName: skillRow.name,
      };
    }),

  getResourceBySkillIdAndPath: publicProcedure
    .input(
      z.object({
        skillId: z.string().uuid(),
        resourcePath: z.string().min(1),
      }),
    )
    .output(
      resourceOutput.extend({
        skillId: z.string().uuid(),
        skillSlug: z.string(),
        skillName: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skillRows = await db
        .select()
        .from(skill)
        .where(and(eq(skill.id, input.skillId), visibilityFilter(ctx.session)));

      const skillRow = skillRows[0];
      if (!skillRow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Skill not found" });
      }

      const resourceRows = await db
        .select()
        .from(skillResource)
        .where(
          and(eq(skillResource.skillId, skillRow.id), eq(skillResource.path, input.resourcePath)),
        );

      const resource = resourceRows[0];
      if (!resource) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found" });
      }

      return {
        ...resource,
        skillId: skillRow.id,
        skillSlug: skillRow.slug,
        skillName: skillRow.name,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        slug: z.string().min(1),
        name: z.string().min(1),
        description: z.string().min(1),
        skillMarkdown: z.string(),
        visibility: visibilityEnum.default("private"),
        frontmatter: z.record(z.string(), z.unknown()).default({}),
        metadata: z.record(z.string(), z.unknown()).default({}),
        sourceUrl: z.string().url().nullish(),
        sourceIdentifier: z.string().nullish(),
        resources: z.array(resourceInput).default([]),
      }),
    )
    .output(skillOutput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [created] = await db
        .insert(skill)
        .values({
          ownerUserId: userId,
          slug: input.slug,
          name: input.name,
          description: input.description,
          skillMarkdown: input.skillMarkdown,
          visibility: input.visibility,
          frontmatter: input.frontmatter,
          metadata: input.metadata,
          sourceUrl: input.sourceUrl ?? null,
          sourceIdentifier: input.sourceIdentifier ?? null,
        })
        .returning();

      if (!created) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create skill" });
      }

      let resources: (typeof skillResource.$inferSelect)[] = [];

      if (input.resources.length > 0) {
        resources = await db
          .insert(skillResource)
          .values(
            input.resources.map((r) => ({
              skillId: created.id,
              path: r.path,
              kind: r.kind,
              content: r.content,
              metadata: r.metadata,
            })),
          )
          .returning();
      }

      await syncAutoLinks(created.id, input.skillMarkdown, userId);

      return await toSkillOutput(created, resources);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        slug: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        skillMarkdown: z.string().optional(),
        visibility: visibilityEnum.optional(),
        frontmatter: z.record(z.string(), z.unknown()).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        sourceUrl: z.string().url().nullish(),
        sourceIdentifier: z.string().nullish(),
        resources: z
          .array(
            resourceInput.extend({
              /** null path = new resource, existing path = upsert, omitted = no change */
              id: z.string().uuid().optional(),
              delete: z.boolean().optional(),
            }),
          )
          .optional(),
      }),
    )
    .output(skillOutput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // fetch and verify ownership
      const [existing] = await db.select().from(skill).where(eq(skill.id, input.id));

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Skill not found" });
      }
      if (existing.ownerUserId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not the skill owner" });
      }

      // build partial update set
      const updates: Partial<typeof skill.$inferInsert> = {};
      if (input.slug !== undefined) updates.slug = input.slug;
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.skillMarkdown !== undefined) updates.skillMarkdown = input.skillMarkdown;
      if (input.visibility !== undefined) updates.visibility = input.visibility;
      if (input.frontmatter !== undefined) updates.frontmatter = input.frontmatter;
      if (input.metadata !== undefined) updates.metadata = input.metadata;
      if (input.sourceUrl !== undefined) updates.sourceUrl = input.sourceUrl ?? null;
      if (input.sourceIdentifier !== undefined)
        updates.sourceIdentifier = input.sourceIdentifier ?? null;

      let updatedSkill = existing;

      if (Object.keys(updates).length > 0) {
        const [row] = await db.update(skill).set(updates).where(eq(skill.id, input.id)).returning();
        if (row) updatedSkill = row;
      }

      // handle resource mutations when provided
      if (input.resources) {
        const toDelete = input.resources.filter((r) => r.delete && r.id).map((r) => r.id!);

        if (toDelete.length > 0) {
          await db
            .delete(skillResource)
            .where(and(eq(skillResource.skillId, input.id), inArray(skillResource.id, toDelete)));
        }

        for (const r of input.resources.filter((r) => r.id && !r.delete)) {
          await db
            .update(skillResource)
            .set({
              path: r.path,
              kind: r.kind,
              content: r.content,
              metadata: r.metadata,
            })
            .where(and(eq(skillResource.id, r.id!), eq(skillResource.skillId, input.id)));
        }

        const toInsert = input.resources.filter((r) => !r.id && !r.delete);
        if (toInsert.length > 0) {
          await db.insert(skillResource).values(
            toInsert.map((r) => ({
              skillId: input.id,
              path: r.path,
              kind: r.kind,
              content: r.content,
              metadata: r.metadata,
            })),
          );
        }
      }

      // sync auto-generated links when markdown changed
      if (input.skillMarkdown !== undefined) {
        await syncAutoLinks(input.id, input.skillMarkdown, userId);
      }

      // fetch final resources state
      const resources = await db
        .select()
        .from(skillResource)
        .where(eq(skillResource.skillId, input.id));

      return await toSkillOutput(updatedSkill, resources);
    }),

  graph: protectedProcedure.output(graphOutput).query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const skills = await db.select().from(skill).where(eq(skill.ownerUserId, userId));

    if (skills.length === 0) return { nodes: [], edges: [] };

    const skillIds = skills.map((s) => s.id);

    const resources = await db
      .select()
      .from(skillResource)
      .where(inArray(skillResource.skillId, skillIds));

    const resourceIds = resources.map((r) => r.id);

    const links =
      skillIds.length > 0 || resourceIds.length > 0
        ? await db
            .select()
            .from(skillLink)
            .where(
              or(
                ...(skillIds.length > 0
                  ? [
                      inArray(skillLink.sourceSkillId, skillIds),
                      inArray(skillLink.targetSkillId, skillIds),
                    ]
                  : []),
                ...(resourceIds.length > 0
                  ? [
                      inArray(skillLink.sourceResourceId, resourceIds),
                      inArray(skillLink.targetResourceId, resourceIds),
                    ]
                  : []),
              ),
            )
        : [];

    return buildGraphPayload(skills, resources, links);
  }),

  // connected component around a single skill (works for public skills too)
  graphForSkill: publicProcedure
    .input(z.object({ skillId: z.string().uuid() }))
    .output(graphOutput)
    .query(async ({ ctx, input }) => {
      const visitedSkillIds = new Set<string>();
      const queue = [input.skillId];
      const allSkills: (typeof skill.$inferSelect)[] = [];
      const allResources: (typeof skillResource.$inferSelect)[] = [];
      const allLinks: (typeof skillLink.$inferSelect)[] = [];
      const seenLinkIds = new Set<string>();

      const MAX_ITERATIONS = 10;
      let iteration = 0;

      while (queue.length > 0 && iteration < MAX_ITERATIONS) {
        iteration++;
        const batch = queue.splice(0, queue.length).filter((id) => !visitedSkillIds.has(id));
        if (batch.length === 0) break;

        for (const id of batch) visitedSkillIds.add(id);

        const skills = await db
          .select()
          .from(skill)
          .where(and(inArray(skill.id, batch), visibilityFilter(ctx.session)));

        const foundIds = skills.map((s) => s.id);
        if (foundIds.length === 0) break;

        allSkills.push(...skills);

        const resources = await db
          .select()
          .from(skillResource)
          .where(inArray(skillResource.skillId, foundIds));

        allResources.push(...resources);

        const resourceIds = resources.map((r) => r.id);
        const linkConditions = [
          inArray(skillLink.sourceSkillId, foundIds),
          inArray(skillLink.targetSkillId, foundIds),
          ...(resourceIds.length > 0
            ? [
                inArray(skillLink.sourceResourceId, resourceIds),
                inArray(skillLink.targetResourceId, resourceIds),
              ]
            : []),
        ];

        const links = await db
          .select()
          .from(skillLink)
          .where(or(...linkConditions));

        for (const l of links) {
          if (!seenLinkIds.has(l.id)) {
            seenLinkIds.add(l.id);
            allLinks.push(l);
          }
        }

        // queue newly discovered skill IDs from direct skill references
        for (const l of links) {
          if (l.sourceSkillId && !visitedSkillIds.has(l.sourceSkillId)) queue.push(l.sourceSkillId);
          if (l.targetSkillId && !visitedSkillIds.has(l.targetSkillId)) queue.push(l.targetSkillId);
        }

        // for resource references, look up parent skills we haven't visited yet
        const unknownResourceIds = links
          .flatMap((l) => [l.sourceResourceId, l.targetResourceId])
          .filter((id): id is string => !!id && !allResources.some((r) => r.id === id));

        if (unknownResourceIds.length > 0) {
          const extra = await db
            .select({ skillId: skillResource.skillId })
            .from(skillResource)
            .where(inArray(skillResource.id, unknownResourceIds));

          for (const row of extra) {
            if (!visitedSkillIds.has(row.skillId)) queue.push(row.skillId);
          }
        }
      }

      return buildGraphPayload(allSkills, allResources, allLinks);
    }),

  duplicate: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        slug: z.string().min(1).optional(),
      }),
    )
    .output(skillOutput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // fetch source skill + resources (respects visibility)
      const [source] = await db
        .select()
        .from(skill)
        .where(and(eq(skill.id, input.id), visibilityFilter(ctx.session)));

      if (!source) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Skill not found" });
      }

      const sourceResources = await db
        .select()
        .from(skillResource)
        .where(eq(skillResource.skillId, source.id));

      const slug = input.slug || source.slug;

      const [created] = await db
        .insert(skill)
        .values({
          ownerUserId: userId,
          slug,
          name: source.name,
          description: source.description,
          skillMarkdown: source.skillMarkdown,
          visibility: "private",
          frontmatter: source.frontmatter,
          metadata: { importedFrom: { skillId: source.id, slug: source.slug } },
          sourceUrl: source.sourceUrl,
          sourceIdentifier: source.sourceIdentifier,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to duplicate skill",
        });
      }

      let resources: (typeof skillResource.$inferSelect)[] = [];

      if (sourceResources.length > 0) {
        resources = await db
          .insert(skillResource)
          .values(
            sourceResources.map((r) => ({
              skillId: created.id,
              path: r.path,
              kind: r.kind,
              content: r.content,
              metadata: r.metadata,
            })),
          )
          .returning();
      }

      await syncAutoLinks(created.id, source.skillMarkdown, userId);

      return await toSkillOutput(created, resources);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [existing] = await db
        .select({ id: skill.id, ownerUserId: skill.ownerUserId })
        .from(skill)
        .where(eq(skill.id, input.id));

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Skill not found" });
      }
      if (existing.ownerUserId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not the skill owner" });
      }

      // hard delete — FK cascades handle resources and links
      await db.delete(skill).where(eq(skill.id, input.id));

      return { success: true as const };
    }),
});
