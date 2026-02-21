import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, ilike, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@omniscient/db";
import { skill, skillResource } from "@omniscient/db/schema/skills";

import { protectedProcedure, publicProcedure, router } from "../index";

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

/** map a skill row + resources array to the output shape */
function toSkillOutput(
  row: typeof skill.$inferSelect,
  resources: (typeof skillResource.$inferSelect)[],
) {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    visibility: row.visibility,
    slug: row.slug,
    name: row.name,
    description: row.description,
    originalMarkdown: row.skillMarkdown,
    renderedMarkdown: row.skillMarkdown, // task 7 adds actual rendering
    frontmatter: row.frontmatter,
    metadata: row.metadata,
    sourceUrl: row.sourceUrl,
    sourceIdentifier: row.sourceIdentifier,
    resources,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// -- router --

export const skillsRouter = router({
  list: publicProcedure
    .input(
      cursorPaginationInput.extend({
        search: z.string().optional(),
      }),
    )
    .output(paginatedSkillList)
    .query(async ({ ctx, input }) => {
      const { cursor, limit, search } = input;

      const conditions = [visibilityFilter(ctx.session)];

      if (cursor) {
        conditions.push(gt(skill.id, cursor));
      }

      if (search) {
        const pattern = `%${search}%`;
        conditions.push(or(ilike(skill.name, pattern), ilike(skill.slug, pattern))!);
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

      return toSkillOutput(row, resources);
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

      return toSkillOutput(row, resources);
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
    .mutation(async () => {
      throw new Error("not implemented");
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
    .mutation(async () => {
      throw new Error("not implemented");
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.literal(true) }))
    .mutation(async () => {
      throw new Error("not implemented");
    }),
});
