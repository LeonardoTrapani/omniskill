"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Link2,
  Loader2,
  Search,
  Wand2,
  Wrench,
  XCircle,
} from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { createMarkdownComponents } from "@/components/skills/markdown-components";
import { markdownUrlTransform } from "@/components/skills/markdown-url-transform";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import type { SelectedSkill } from "../../_hooks/use-modal-machine";

interface ChatViewProps {
  selectedSkill: SelectedSkill | null;
  initialInput?: string;
  height?: number;
  className?: string;
}

type TextPart = {
  type: string;
  text?: string;
};

const TOOL_LABELS: Record<string, string> = {
  search_skills: "search skills",
  get_skill: "inspect skill",
  create_skill: "create skill",
  update_skill: "update skill",
  duplicate_skill: "duplicate skill",
};

const GRAPH_MUTATION_TOOLS = new Set([
  "create_skill",
  "update_skill",
  "delete_skill",
  "duplicate_skill",
]);

function formatJson(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function summarizeToolOutput(toolName: string, output: unknown): string | null {
  if (!output || typeof output !== "object") return null;

  const payload = output as {
    ok?: boolean;
    total?: number;
    items?: unknown[];
    skill?: { name?: string; slug?: string };
    error?: string;
  };

  if (payload.ok === false) {
    return payload.error ? `failed: ${payload.error}` : "failed";
  }

  if (toolName === "search_skills") {
    if (typeof payload.total === "number") {
      return `${payload.total} match${payload.total === 1 ? "" : "es"}`;
    }
    if (Array.isArray(payload.items)) {
      const count = payload.items.length;
      return `${count} match${count === 1 ? "" : "es"}`;
    }
  }

  if (payload.skill?.name) {
    return `skill: ${payload.skill.name}`;
  }

  return null;
}

function renderPayloadAccordion(options: {
  key: string;
  label: string;
  payload: unknown;
  tone?: "muted" | "default";
}) {
  const { key, label, payload, tone = "default" } = options;
  const text = formatJson(payload);
  if (!text) return null;

  const textSizeHint =
    text.length >= 1024 ? `${Math.ceil(text.length / 1024)}kb` : `${text.length}ch`;
  const textColor = tone === "muted" ? "text-muted-foreground" : "text-foreground";

  return (
    <details key={key} className="border border-border/70 bg-secondary/35">
      <summary className="flex cursor-pointer items-center justify-between px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span className="normal-case text-[10px]">{textSizeHint}</span>
      </summary>
      <pre className={`overflow-x-auto border-t border-border/60 p-2 text-[10px] ${textColor}`}>
        {text}
      </pre>
    </details>
  );
}

function renderMessagePart(
  part: UIMessage["parts"][number],
  key: string,
  markdownComponents: ReturnType<typeof createMarkdownComponents>,
): ReactNode {
  if (part.type === "text") {
    const text = (part as TextPart).text?.trim();
    if (!text) return null;
    return (
      <ReactMarkdown
        key={key}
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
        urlTransform={markdownUrlTransform}
      >
        {text}
      </ReactMarkdown>
    );
  }

  if (isToolUIPart(part)) {
    const state = part.state;
    const rawToolName = part.type.replace("tool-", "");
    const toolName = TOOL_LABELS[rawToolName] ?? rawToolName.replaceAll("_", " ");
    const showInput = state === "input-streaming" || state === "input-available";
    const showOutput = state === "output-available";
    const showError = state === "output-error";
    const inputPayload = (part as { input?: unknown }).input;
    const outputPayload = (part as { output?: unknown }).output;
    const outputSummary = summarizeToolOutput(rawToolName, outputPayload);

    return (
      <details
        key={part.toolCallId || key}
        className="group border border-border/90 bg-background/60 text-[11px]"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-1.5 text-foreground">
            <ChevronRight className="size-3 text-muted-foreground transition-transform group-open:rotate-90" />
            {toolName.includes("search") ? (
              <Search className="size-3" />
            ) : toolName.includes("duplicate") ? (
              <Link2 className="size-3" />
            ) : toolName.includes("create") || toolName.includes("update") ? (
              <Wrench className="size-3" />
            ) : (
              <Wand2 className="size-3" />
            )}
            <span className="font-medium">{toolName}</span>
          </div>

          {showError ? (
            <span className="inline-flex items-center gap-1 text-destructive/90">
              <XCircle className="size-3" />
              failed
            </span>
          ) : showOutput ? (
            <span className="inline-flex items-center gap-1 text-emerald-500">
              <CheckCircle2 className="size-3" />
              complete
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              running
            </span>
          )}
        </summary>

        <div className="space-y-1.5 border-t border-border/70 px-2.5 py-2">
          {showOutput && outputSummary && (
            <p className="text-[10px] text-muted-foreground">{outputSummary}</p>
          )}

          {showInput &&
            renderPayloadAccordion({
              key: `${part.toolCallId || key}-input`,
              label: "tool input",
              payload: inputPayload,
              tone: "muted",
            })}

          {showOutput &&
            renderPayloadAccordion({
              key: `${part.toolCallId || key}-output`,
              label: "tool output",
              payload: outputPayload,
              tone: "default",
            })}

          {showError && (
            <div className="border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-destructive/90">
              {(part as { errorText?: string }).errorText ?? "Tool execution failed."}
            </div>
          )}
        </div>
      </details>
    );
  }

  return null;
}

function buildInitialAssistantMessage(selectedSkill: SelectedSkill | null) {
  if (selectedSkill) {
    return `Great, we can work from "${selectedSkill.name}". Tell me the outcome you want, and I will propose import, link, and custom options before writing.`;
  }

  return "Tell me what skill you want. I will search for existing options first, propose import/link/create paths, and only create after your explicit sign-off.";
}

export default function ChatView({
  selectedSkill,
  initialInput,
  height,
  className,
}: ChatViewProps) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState(initialInput ?? "");
  const handledMutationToolCallsRef = useRef<Set<string>>(new Set());

  const markdownComponents = useMemo(
    () =>
      createMarkdownComponents({
        skillId: selectedSkill?.id ?? "chat",
        skillName: selectedSkill?.name,
        findResourceByHref: () => null,
      }),
    [selectedSkill?.id, selectedSkill?.name],
  );

  useEffect(() => {
    setInput(initialInput ?? "");
  }, [initialInput]);

  const initialMessages = useMemo<UIMessage[]>(
    () => [
      {
        id: `init-${selectedSkill?.id ?? "create"}`,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: buildInitialAssistantMessage(selectedSkill),
          },
        ],
      },
    ],
    [selectedSkill],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ id, messages, trigger, messageId }) => ({
          body: {
            id,
            messages,
            trigger,
            messageId,
            selectedSkill,
          },
        }),
      }),
    [selectedSkill],
  );

  const { messages, sendMessage, status, error } = useChat<UIMessage>({
    messages: initialMessages,
    transport,
  });

  useEffect(() => {
    let shouldInvalidateGraph = false;

    for (const message of messages) {
      for (const part of message.parts) {
        if (!isToolUIPart(part) || part.state !== "output-available") {
          continue;
        }

        const toolName = part.type.replace("tool-", "");
        if (!GRAPH_MUTATION_TOOLS.has(toolName)) {
          continue;
        }

        const output = (part as { output?: { ok?: boolean } }).output;
        if (output?.ok === false) {
          continue;
        }

        const toolCallKey = part.toolCallId ?? `${message.id}:${part.type}`;
        if (handledMutationToolCallsRef.current.has(toolCallKey)) {
          continue;
        }

        handledMutationToolCallsRef.current.add(toolCallKey);
        shouldInvalidateGraph = true;
      }
    }

    if (!shouldInvalidateGraph) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: trpc.skills.graph.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.skills.graphForSkill.queryKey() });
  }, [messages, queryClient]);

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text?.trim()) return;
    sendMessage({ text: message.text });
    setInput("");
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden font-[family-name:var(--font-chat)]",
        height ? "min-h-0" : "h-[60vh]",
        className,
      )}
      style={height ? { height } : undefined}
    >
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-3 p-0">
          {messages.length === 0 && (
            <ConversationEmptyState
              title={selectedSkill ? "Integrate this skill" : "Create a skill"}
              description={
                selectedSkill
                  ? "Describe what you want to build from this skill, and the assistant will search before creating."
                  : "Describe what the skill should do, and the assistant will search before creating."
              }
            />
          )}

          {messages.map((message) => {
            const renderedParts = message.parts.map((part, index) =>
              renderMessagePart(part, `${message.id}-${index}`, markdownComponents),
            );

            if (renderedParts.every((part) => part === null)) return null;

            return (
              <div
                key={message.id}
                className={`border px-3 py-2.5 text-sm ${
                  message.role === "user"
                    ? "border-primary/35 bg-primary/10"
                    : "border-border bg-secondary/40"
                }`}
              >
                <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
                  {message.role === "user" ? "You" : "Agent"}
                </span>
                <div className="space-y-2">{renderedParts}</div>
              </div>
            );
          })}

          {(status === "submitted" || status === "streaming") && (
            <div className="border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
              Thinking through search, links, and skill structure...
            </div>
          )}

          {error && (
            <div className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive/90">
              {error.message}
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mt-3 border-t border-border pt-3">
        <PromptInput onSubmit={handleSubmit} className="border border-border bg-background/90">
          <PromptInputTextarea
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            placeholder="Describe the outcome, trigger phrases, and any references to include..."
            className="max-h-32 min-h-10 text-[13px]"
          />
          <PromptInputFooter>
            <p className="px-2 text-[10px] text-muted-foreground">
              writes happen only after explicit sign-off
            </p>
            <PromptInputSubmit status={status} disabled={!input.trim() && status !== "streaming"} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
