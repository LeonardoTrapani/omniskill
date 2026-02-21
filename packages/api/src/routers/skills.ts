import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, ilike, inArray, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@omniscient/db";
import { skill, skillResource } from "@omniscient/db/schema/skills";

import { protectedProcedure, publicProcedure, router } from "../index";
import { syncAutoLinks } from "../lib/link-sync";

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

      // sync auto-generated links from [[...]] mentions in markdown
      await syncAutoLinks(created.id, input.skillMarkdown, userId);

      return toSkillOutput(created, resources);
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

      return toSkillOutput(updatedSkill, resources);
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
