import { appRouter, createContext } from "@omniscient/api";
import { env } from "@omniscient/env/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import type { Context as HonoContext } from "hono";
import { z } from "zod";

const visibilitySchema = z.enum(["public", "private"]);
const resourceKindSchema = z.enum(["reference", "script", "asset", "other"]);

const selectedSkillSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string(),
});

const chatRequestSchema = z.object({
  messages: z.array(z.unknown()),
  selectedSkill: selectedSkillSchema.nullish(),
});

const resourceCreateSchema = z.object({
  path: z.string().min(1),
  kind: resourceKindSchema.default("reference"),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const resourceUpdateSchema = resourceCreateSchema.extend({
  id: z.string().uuid().optional(),
  delete: z.boolean().optional(),
});

const searchSkillsInputSchema = z.object({
  query: z.string().min(1),
  scope: z.enum(["own", "all"]).default("all"),
  limit: z.number().int().min(1).max(20).default(8),
  visibility: visibilitySchema.optional(),
});

const getSkillInputSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).optional(),
});

const createSkillInputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().min(1),
  skillMarkdown: z.string().min(1),
  visibility: visibilitySchema.default("private"),
  resources: z.array(resourceCreateSchema).default([]),
  sourceIdentifier: z.string().min(1).optional(),
});

const updateSkillInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  skillMarkdown: z.string().min(1).optional(),
  visibility: visibilitySchema.optional(),
  resources: z.array(resourceUpdateSchema).optional(),
  sourceIdentifier: z.string().min(1).nullish(),
});

const duplicateSkillInputSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).optional(),
});

type SelectedSkill = z.infer<typeof selectedSkillSchema>;

function isTextPart(part: unknown): part is { type: "text"; text: string } {
  if (typeof part !== "object" || part === null) return false;
  const candidate = part as { type?: unknown; text?: unknown };
  return candidate.type === "text" && typeof candidate.text === "string";
}

function extractText(message: UIMessage): string {
  return message.parts
    .filter(isTextPart)
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function getLatestUserText(messages: UIMessage[]): string {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!latestUserMessage) return "";
  return extractText(latestUserMessage);
}

const APPROVAL_REGEX =
  /\b(ok|okay|looks good|looks great|sounds good|fine to me|works for me|approved|ship it|go ahead|create( it| this)?|import( it| this)?|do it|let's do it)\b/i;
const HOLD_REGEX = /\b(don't|do not|not yet|wait|hold)\b/i;

function hasExplicitApproval(text: string): boolean {
  if (!text.trim()) return false;
  if (HOLD_REGEX.test(text)) return false;
  return APPROVAL_REGEX.test(text);
}

function toSlug(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (slug.length > 0) return slug.slice(0, 64);
  return `skill-${Date.now()}`;
}

function buildSystemPrompt({ selectedSkill }: { selectedSkill: SelectedSkill | null }) {
  const selectedSkillInstructions = selectedSkill
    ? [
        "A selected skill was provided by the UI.",
        "Treat it as context the user may want to import, link, adapt, or extend.",
        "If they want to build from it, inspect it with get_skill before proposing write actions.",
      ].join("\n")
    : "No selected skill context was provided.";

  const selectedSkillContext = selectedSkill
    ? [
        "Selected skill context:",
        `- id: ${selectedSkill.id}`,
        `- name: ${selectedSkill.name}`,
        `- slug: ${selectedSkill.slug}`,
        `- description: ${selectedSkill.description}`,
      ].join("\n")
    : "";

  return [
    "You are Omniscient's skill architect assistant.",
    "",
    "Follow the Skill Creator and Omniscient workflow:",
    "1) discover -> search existing skills first",
    "2) decide with user -> import, link, or new",
    "3) draft -> show the proposed skill structure and markdown",
    "4) iterate -> collect feedback and revise",
    "5) execute -> only after explicit user sign-off",
    "",
    "Conversation behavior:",
    "- Start by clarifying the outcome and constraints.",
    "- Search existing skills before proposing a new one.",
    "- Offer options: import as-is, link to existing skills/resources, or create from scratch.",
    "",
    "Skill authoring constraints:",
    "- Keep SKILL.md concise and procedural.",
    "- Include YAML frontmatter with name and description semantics reflected in skill metadata.",
    "- Put detailed docs in resources (references/, scripts/, assets/) instead of bloating SKILL.md.",
    "- For graph links, embed [[skill:<uuid>]] and [[resource:<uuid>]] in markdown.",
    "- Never invent UUIDs. Use search/get tools first.",
    "",
    "Important graph behavior:",
    "- Links are auto-created from markdown mentions when a skill is created/updated.",
    "- Auto-links are same-owner only. If the user wants links to a public skill, duplicate/fork it first.",
    "",
    "Execution rules:",
    "- Do not call create_skill, update_skill, or duplicate_skill before explicit user approval.",
    "- Before execution, present a short final plan with slug, visibility, resources, and link targets.",
    "- After execution, summarize what was created/changed and what links/resources were included.",
    "",
    selectedSkillInstructions,
    selectedSkillContext,
  ]
    .filter(Boolean)
    .join("\n");
}

function asMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export async function handleChatRequest(c: HonoContext) {
  if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return c.json({ error: "GOOGLE_GENERATIVE_AI_API_KEY is missing on the server" }, 503);
  }

  const google = createGoogleGenerativeAI({
    apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
  });

  const payload = await c.req.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid chat payload",
        issues: parsed.error.issues,
      },
      400,
    );
  }

  const selectedSkill = parsed.data.selectedSkill ?? null;

  const context = await createContext({ context: c });
  if (!context.session) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const caller = appRouter.createCaller(context);
  const messages = parsed.data.messages as UIMessage[];
  const latestUserText = getLatestUserText(messages);
  const canWrite = hasExplicitApproval(latestUserText);
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: google(env.GOOGLE_GENERATIVE_AI_MODEL),
    system: buildSystemPrompt({ selectedSkill }),
    messages: modelMessages,
    stopWhen: stepCountIs(10),
    tools: {
      search_skills: tool({
        description:
          "Search existing skills in the user's vault or across all visible skills before proposing a new one.",
        inputSchema: searchSkillsInputSchema,
        execute: async (input) => {
          try {
            const result = await caller.skills.search(input);
            return {
              ok: true,
              total: result.total,
              items: result.items.map((item) => ({
                id: item.id,
                slug: item.slug,
                name: item.name,
                description: item.description,
                visibility: item.visibility,
                matchType: item.matchType,
                score: item.score,
                snippet: item.snippet,
                updatedAt: item.updatedAt.toISOString(),
              })),
            };
          } catch (error) {
            return { ok: false, error: asMessage(error) };
          }
        },
      }),

      get_skill: tool({
        description:
          "Get full skill content (markdown + resources) by id or slug. If no input is provided, it falls back to selectedSkill when available.",
        inputSchema: getSkillInputSchema,
        execute: async (input) => {
          try {
            const skill = input.id
              ? await caller.skills.getById({ id: input.id })
              : input.slug
                ? await caller.skills.getBySlug({ slug: input.slug })
                : selectedSkill
                  ? await caller.skills.getById({ id: selectedSkill.id })
                  : null;

            if (!skill) {
              return {
                ok: false,
                error:
                  "Provide id or slug. If selected skill context is present it will be used by default.",
              };
            }

            return {
              ok: true,
              skill: {
                id: skill.id,
                slug: skill.slug,
                name: skill.name,
                description: skill.description,
                visibility: skill.visibility,
                skillMarkdown: skill.originalMarkdown,
                resources: skill.resources.map((resource) => ({
                  id: resource.id,
                  path: resource.path,
                  kind: resource.kind,
                  content: resource.content,
                  metadata: resource.metadata,
                })),
                updatedAt: skill.updatedAt.toISOString(),
              },
            };
          } catch (error) {
            return { ok: false, error: asMessage(error) };
          }
        },
      }),

      create_skill: tool({
        description:
          "Create a new skill with markdown, resources, and mention links. Use only after user sign-off.",
        inputSchema: createSkillInputSchema,
        execute: async (input) => {
          if (!canWrite) {
            return {
              ok: false,
              error:
                "Missing explicit approval in the latest user message. Ask for clear sign-off like 'ok that's fine to me'.",
            };
          }

          try {
            const name = input.name.trim();
            const description = input.description.trim();

            const created = await caller.skills.create({
              slug: toSlug(input.slug ?? name),
              name,
              description,
              skillMarkdown: input.skillMarkdown,
              visibility: input.visibility,
              frontmatter: {
                name,
                description,
              },
              metadata: {
                source: "ai-chat",
              },
              sourceIdentifier: input.sourceIdentifier ?? "ai-chat",
              resources: input.resources,
            });

            return {
              ok: true,
              skill: {
                id: created.id,
                slug: created.slug,
                name: created.name,
                description: created.description,
                visibility: created.visibility,
                resourceCount: created.resources.length,
              },
            };
          } catch (error) {
            return { ok: false, error: asMessage(error) };
          }
        },
      }),

      update_skill: tool({
        description:
          "Update an existing skill. If selected skill context exists, id defaults to that skill. Use only after user sign-off.",
        inputSchema: updateSkillInputSchema,
        execute: async (input) => {
          if (!canWrite) {
            return {
              ok: false,
              error:
                "Missing explicit approval in the latest user message. Ask for clear sign-off like 'ok that's fine to me'.",
            };
          }

          const targetId = input.id ?? selectedSkill?.id;
          if (!targetId) {
            return { ok: false, error: "Skill id is required for updates." };
          }

          const hasChanges =
            input.name !== undefined ||
            input.slug !== undefined ||
            input.description !== undefined ||
            input.skillMarkdown !== undefined ||
            input.visibility !== undefined ||
            input.resources !== undefined ||
            input.sourceIdentifier !== undefined;

          if (!hasChanges) {
            return { ok: false, error: "No updates were provided." };
          }

          try {
            const updated = await caller.skills.update({
              id: targetId,
              ...(input.name !== undefined ? { name: input.name.trim() } : {}),
              ...(input.slug !== undefined ? { slug: toSlug(input.slug) } : {}),
              ...(input.description !== undefined ? { description: input.description.trim() } : {}),
              ...(input.skillMarkdown !== undefined ? { skillMarkdown: input.skillMarkdown } : {}),
              ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
              ...(input.resources !== undefined ? { resources: input.resources } : {}),
              ...(input.sourceIdentifier !== undefined
                ? { sourceIdentifier: input.sourceIdentifier ?? null }
                : {}),
              metadata: {
                source: "ai-chat",
              },
            });

            return {
              ok: true,
              skill: {
                id: updated.id,
                slug: updated.slug,
                name: updated.name,
                description: updated.description,
                visibility: updated.visibility,
                resourceCount: updated.resources.length,
              },
            };
          } catch (error) {
            return { ok: false, error: asMessage(error) };
          }
        },
      }),

      duplicate_skill: tool({
        description:
          "Fork an existing skill into the current user's private vault. Use before linking to public skills.",
        inputSchema: duplicateSkillInputSchema,
        execute: async (input) => {
          if (!canWrite) {
            return {
              ok: false,
              error:
                "Missing explicit approval in the latest user message. Ask for clear sign-off like 'ok that's fine to me'.",
            };
          }

          const sourceId = input.id ?? selectedSkill?.id;
          if (!sourceId) {
            return { ok: false, error: "Skill id is required to duplicate." };
          }

          try {
            const duplicated = await caller.skills.duplicate({
              id: sourceId,
              ...(input.slug ? { slug: toSlug(input.slug) } : {}),
            });

            return {
              ok: true,
              skill: {
                id: duplicated.id,
                slug: duplicated.slug,
                name: duplicated.name,
                description: duplicated.description,
                visibility: duplicated.visibility,
                resourceCount: duplicated.resources.length,
              },
            };
          } catch (error) {
            return { ok: false, error: asMessage(error) };
          }
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
