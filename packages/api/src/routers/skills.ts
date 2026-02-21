import { z } from "zod";

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
  metadata: z.record(z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const resourceInput = z.object({
  path: z.string().min(1),
  kind: resourceKindEnum.default("reference"),
  content: z.string(),
  metadata: z.record(z.unknown()).default({}),
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
  frontmatter: z.record(z.unknown()),
  metadata: z.record(z.unknown()),
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

// -- router --

export const skillsRouter = router({
  list: publicProcedure
    .input(
      cursorPaginationInput.extend({
        search: z.string().optional(),
      }),
    )
    .output(paginatedSkillList)
    .query(async () => {
      // implemented in task 2
      throw new Error("not implemented");
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(skillOutput)
    .query(async () => {
      throw new Error("not implemented");
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .output(skillOutput)
    .query(async () => {
      throw new Error("not implemented");
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
    .query(async () => {
      throw new Error("not implemented");
    }),

  create: protectedProcedure
    .input(
      z.object({
        slug: z.string().min(1),
        name: z.string().min(1),
        description: z.string().min(1),
        skillMarkdown: z.string(),
        visibility: visibilityEnum.default("private"),
        frontmatter: z.record(z.unknown()).default({}),
        metadata: z.record(z.unknown()).default({}),
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
        frontmatter: z.record(z.unknown()).optional(),
        metadata: z.record(z.unknown()).optional(),
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
