import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const skillVisibilityEnum = pgEnum("skill_visibility", ["public", "private"]);

export const skillResourceKindEnum = pgEnum("skill_resource_kind", [
  "reference",
  "script",
  "asset",
  "other",
]);

export const skill = pgTable(
  "skill",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: text("owner_user_id").references(() => user.id, { onDelete: "cascade" }),
    visibility: skillVisibilityEnum("visibility").notNull().default("public"),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    skillMarkdown: text("skill_markdown").notNull(),
    frontmatter: jsonb("frontmatter")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    sourceUrl: text("source_url"),
    sourceIdentifier: text("source_identifier"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("skill_owner_user_id_idx").on(table.ownerUserId),
    index("skill_visibility_idx").on(table.visibility),
    uniqueIndex("skill_private_owner_slug_idx").on(table.ownerUserId, table.slug),
    uniqueIndex("skill_public_slug_idx")
      .on(table.slug)
      .where(sql`${table.visibility} = 'public' and ${table.ownerUserId} is null`),
    check(
      "skill_visibility_owner_check",
      sql`${table.visibility} = 'public' or ${table.ownerUserId} is not null`,
    ),
  ],
);

export const skillResource = pgTable(
  "skill_resource",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skill.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    kind: skillResourceKindEnum("kind").notNull().default("reference"),
    content: text("content").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("skill_resource_skill_id_idx").on(table.skillId),
    index("skill_resource_kind_idx").on(table.kind),
    uniqueIndex("skill_resource_skill_path_idx").on(table.skillId, table.path),
  ],
);

export const skillLink = pgTable(
  "skill_link",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceSkillId: uuid("source_skill_id").references(() => skill.id, { onDelete: "cascade" }),
    sourceResourceId: uuid("source_resource_id").references(() => skillResource.id, {
      onDelete: "cascade",
    }),
    targetSkillId: uuid("target_skill_id").references(() => skill.id, { onDelete: "cascade" }),
    targetResourceId: uuid("target_resource_id").references(() => skillResource.id, {
      onDelete: "cascade",
    }),
    kind: text("kind").notNull().default("related"),
    note: text("note"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("skill_link_source_skill_id_idx").on(table.sourceSkillId),
    index("skill_link_source_resource_id_idx").on(table.sourceResourceId),
    index("skill_link_target_skill_id_idx").on(table.targetSkillId),
    index("skill_link_target_resource_id_idx").on(table.targetResourceId),
    index("skill_link_kind_idx").on(table.kind),
    check(
      "skill_link_source_check",
      sql`(${table.sourceSkillId} is not null and ${table.sourceResourceId} is null) or (${table.sourceSkillId} is null and ${table.sourceResourceId} is not null)`,
    ),
    check(
      "skill_link_target_check",
      sql`(${table.targetSkillId} is not null and ${table.targetResourceId} is null) or (${table.targetSkillId} is null and ${table.targetResourceId} is not null)`,
    ),
  ],
);

export const skillRelations = relations(skill, ({ one, many }) => ({
  owner: one(user, {
    fields: [skill.ownerUserId],
    references: [user.id],
  }),
  resources: many(skillResource),
  outgoingLinks: many(skillLink, {
    relationName: "skill_link_source_skill",
  }),
  incomingLinks: many(skillLink, {
    relationName: "skill_link_target_skill",
  }),
}));

export const skillResourceRelations = relations(skillResource, ({ one, many }) => ({
  skill: one(skill, {
    fields: [skillResource.skillId],
    references: [skill.id],
  }),
  outgoingLinks: many(skillLink, {
    relationName: "skill_link_source_resource",
  }),
  incomingLinks: many(skillLink, {
    relationName: "skill_link_target_resource",
  }),
}));

export const skillLinkRelations = relations(skillLink, ({ one }) => ({
  sourceSkill: one(skill, {
    fields: [skillLink.sourceSkillId],
    references: [skill.id],
    relationName: "skill_link_source_skill",
  }),
  sourceResource: one(skillResource, {
    fields: [skillLink.sourceResourceId],
    references: [skillResource.id],
    relationName: "skill_link_source_resource",
  }),
  targetSkill: one(skill, {
    fields: [skillLink.targetSkillId],
    references: [skill.id],
    relationName: "skill_link_target_skill",
  }),
  targetResource: one(skillResource, {
    fields: [skillLink.targetResourceId],
    references: [skillResource.id],
    relationName: "skill_link_target_resource",
  }),
  createdBy: one(user, {
    fields: [skillLink.createdByUserId],
    references: [user.id],
  }),
}));
