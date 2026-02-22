"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { Link2, Loader2, Mic, Search, Wand2, Wrench } from "lucide-react";
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
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import {
  Context,
  ContextContent,
  ContextContentBody,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextTrigger,
} from "@/components/ai-elements/context";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { createMarkdownComponents } from "@/components/skills/markdown-components";
import { markdownUrlTransform } from "@/components/skills/markdown-url-transform";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { useMentionAutocomplete } from "@/hooks/use-mention-autocomplete";
import { MentionDropdown, MentionTextOverlay } from "@/components/ai-elements/mention-dropdown";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import type { SelectedSkill } from "../../_hooks/use-modal-machine";

const MAX_CONTEXT_TOKENS = 120_000;

const SUGGESTIONS = [
  "Create a skill for summarizing documents",
  "Find skills related to code review",
  "Build an API integration skill",
];

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
  search_skills: "Searching skills",
  get_skill: "Inspecting skill",
  create_skill: "Creating skill",
  update_skill: "Updating skill",
  duplicate_skill: "Duplicating skill",
};

const TOOL_ICONS: Record<string, typeof Search> = {
  search_skills: Search,
  get_skill: Wand2,
  create_skill: Wrench,
  update_skill: Wrench,
  duplicate_skill: Link2,
};

function toolStateToStepStatus(state: string): "complete" | "active" | "pending" {
  if (state === "output-available") return "complete";
  if (state === "output-error") return "complete";
  if (state === "input-streaming" || state === "input-available") return "active";
  return "pending";
}

const GRAPH_MUTATION_TOOLS = new Set([
  "create_skill",
  "update_skill",
  "delete_skill",
  "duplicate_skill",
]);

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

function renderMessagePart(
  part: UIMessage["parts"][number],
  key: string,
  markdownComponents: ReturnType<typeof createMarkdownComponents>,
  options?: { isReasoningStreaming?: boolean },
): ReactNode {
  if (part.type === "reasoning") {
    const reasoningPart = part as { type: "reasoning"; text: string };
    if (!reasoningPart.text) return null;
    return (
      <Reasoning key={key} isStreaming={options?.isReasoningStreaming ?? false}>
        <ReasoningTrigger />
        <ReasoningContent>{reasoningPart.text}</ReasoningContent>
      </Reasoning>
    );
  }

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

  return null;
}

function buildInitialAssistantMessage(selectedSkill: SelectedSkill | null) {
  if (selectedSkill) {
    return `I see "${selectedSkill.name}" -- tell me what you want to build from it and I'll search for related skills to connect, then draft a plan.`;
  }

  return "Chat with Omniscient...";
}

export default function ChatView({
  selectedSkill,
  initialInput,
  height,
  className,
}: ChatViewProps) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState(initialInput ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handledMutationToolCallsRef = useRef<Set<string>>(new Set());

  const mention = useMentionAutocomplete({
    textareaRef,
    value: input,
    onValueChange: setInput,
  });

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

  const { usedTokens, usage } = useMemo(() => {
    let inputTokens = 0;
    let outputTokens = 0;
    let reasoningTokens = 0;
    for (const m of messages) {
      const u = (
        m as {
          metadata?: {
            usage?: { inputTokens?: number; outputTokens?: number; reasoningTokens?: number };
          };
        }
      ).metadata?.usage;
      if (u) {
        inputTokens += u.inputTokens ?? 0;
        outputTokens += u.outputTokens ?? 0;
        reasoningTokens += u.reasoningTokens ?? 0;
      }
    }
    return {
      usedTokens: inputTokens + outputTokens + reasoningTokens,
      usage: {
        inputTokens,
        outputTokens,
        reasoningTokens,
        totalTokens: inputTokens + outputTokens + reasoningTokens,
        inputTokenDetails: {
          noCacheTokens: undefined,
          cacheReadTokens: undefined,
          cacheWriteTokens: undefined,
        },
        outputTokenDetails: { textTokens: undefined, reasoningTokens },
      },
    };
  }, [messages]);

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

  const handleTranscript = useCallback((text: string) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
  }, []);

  const { isRecording, isTranscribing, toggleRecording } = useVoiceRecorder({
    onTranscript: handleTranscript,
  });

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text?.trim()) return;
    sendMessage({ text: mention.getSubmitValue(message.text) });
    setInput("");
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden font-chat",
        height ? "min-h-0" : "flex-1 min-h-0",
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
                  ? "Describe what you want to build from this skill and I'll find connections and draft a plan."
                  : "Describe your goal and I'll search existing skills, suggest connections, and draft something."
              }
            />
          )}

          {messages.map((message, messageIndex) => {
            const isLastMessage = messageIndex === messages.length - 1;
            const isStreaming = isLastMessage && (status === "streaming" || status === "submitted");

            const reasoningParts = message.parts.filter((p) => p.type === "reasoning");
            const hasReasoning = reasoningParts.length > 0;
            const reasoningText = reasoningParts
              .map((p) => (p as { text: string }).text)
              .join("\n\n");
            const isReasoningStreaming =
              isStreaming &&
              hasReasoning &&
              !message.parts.some((p) => p.type === "text" && (p as TextPart).text?.trim());

            const renderedParts: ReactNode[] = [];

            if (hasReasoning && reasoningText) {
              renderedParts.push(
                <Reasoning key={`${message.id}-reasoning`} isStreaming={isReasoningStreaming}>
                  <ReasoningTrigger />
                  <ReasoningContent>{reasoningText}</ReasoningContent>
                </Reasoning>,
              );
            }

            const toolParts = message.parts.filter(isToolUIPart);
            if (toolParts.length > 0) {
              const allDone = toolParts.every(
                (p) => p.state === "output-available" || p.state === "output-error",
              );
              const headerLabel = allDone
                ? `Completed ${toolParts.length} step${toolParts.length > 1 ? "s" : ""}`
                : `Working...`;

              renderedParts.push(
                <ChainOfThought key={`${message.id}-cot`} defaultOpen={!allDone}>
                  <ChainOfThoughtHeader>{headerLabel}</ChainOfThoughtHeader>
                  <ChainOfThoughtContent>
                    {toolParts.map((part) => {
                      const rawToolName = part.type.replace("tool-", "");
                      const label = TOOL_LABELS[rawToolName] ?? rawToolName.replaceAll("_", " ");
                      const icon = TOOL_ICONS[rawToolName];
                      const stepStatus = toolStateToStepStatus(part.state);
                      const outputPayload = (part as { output?: unknown }).output;
                      const summary = summarizeToolOutput(rawToolName, outputPayload);

                      const searchItems =
                        rawToolName === "search_skills" && part.state === "output-available"
                          ? ((outputPayload as { items?: { name: string; slug: string }[] })
                              ?.items ?? [])
                          : [];

                      return (
                        <ChainOfThoughtStep
                          key={part.toolCallId || part.type}
                          icon={icon}
                          label={label}
                          description={
                            part.state === "output-error"
                              ? ((part as { errorText?: string }).errorText ?? "Failed")
                              : summary
                          }
                          status={stepStatus}
                        >
                          {searchItems.length > 0 && (
                            <ChainOfThoughtSearchResults>
                              {searchItems.slice(0, 6).map((item) => (
                                <ChainOfThoughtSearchResult key={item.slug}>
                                  {item.name}
                                </ChainOfThoughtSearchResult>
                              ))}
                            </ChainOfThoughtSearchResults>
                          )}
                        </ChainOfThoughtStep>
                      );
                    })}
                  </ChainOfThoughtContent>
                </ChainOfThought>,
              );
            }

            for (let i = 0; i < message.parts.length; i++) {
              const part = message.parts[i];
              if (part.type === "reasoning" || isToolUIPart(part)) continue;
              const rendered = renderMessagePart(part, `${message.id}-${i}`, markdownComponents);
              if (rendered) renderedParts.push(rendered);
            }

            if (renderedParts.length === 0) return null;

            if (message.role === "user") {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary/10 px-3 py-1.5 text-sm">
                    {renderedParts}
                  </div>
                </div>
              );
            }

            return (
              <div key={message.id} className="px-1 py-1 text-sm">
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
              {(error.message?.includes("messaggi AI") || error.message?.includes("esaurito")) && (
                <a href="/#pricing" className="ml-2 text-primary underline hover:no-underline">
                  Upgrade to Pro
                </a>
              )}
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Suggestions — visible only before the user sends a message */}
      {!messages.some((m) => m.role === "user") && (
        <div className="flex flex-wrap gap-2 mt-2 px-1">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => {
                sendMessage({ text: s });
                setInput("");
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 pt-1">
        <PromptInput
          onSubmit={handleSubmit}
          className="border border-muted-foreground/10 bg-muted/30"
        >
          <PromptInputTextarea
            ref={textareaRef}
            value={input}
            onChange={mention.handleChange}
            onKeyDown={mention.handleKeyDown}
            placeholder="Chat with Omniscient..."
            className={cn(
              "max-h-32 min-h-10 text-[13px] placeholder:text-muted-foreground/40",
              mention.hasMentions && "text-transparent placeholder:text-muted-foreground",
            )}
            style={mention.hasMentions ? { caretColor: "hsl(var(--foreground))" } : undefined}
          />
          <PromptInputFooter>
            <div className="flex items-center gap-1.5 px-2">
              <Image src="/regolo-logo.png" alt="Regolo" width={14} height={14} />
              <span className="text-[10px] text-foreground">gpt-oss-120b</span>
              <Context usedTokens={usedTokens} maxTokens={MAX_CONTEXT_TOKENS} usage={usage}>
                <ContextTrigger className="h-5 px-1 text-[10px]" />
                <ContextContent>
                  <ContextContentHeader />
                  <ContextContentBody className="space-y-1">
                    <ContextInputUsage />
                    <ContextOutputUsage />
                    <ContextReasoningUsage />
                  </ContextContentBody>
                </ContextContent>
              </Context>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isTranscribing}
                aria-label={isRecording ? "Stop recording" : "Start voice input"}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
                  isRecording && "text-red-500 animate-pulse",
                )}
              >
                {isTranscribing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Mic className="size-4" />
                )}
              </button>
              <PromptInputSubmit
                status={status}
                variant={input.trim() || status === "streaming" ? "default" : "ghost"}
                className={cn(
                  input.trim() || status === "streaming"
                    ? ""
                    : "text-muted-foreground border border-muted-foreground/10",
                )}
              />
            </div>
          </PromptInputFooter>
        </PromptInput>
        <MentionDropdown {...mention.dropdown} />
        {mention.hasMentions && (
          <MentionTextOverlay textareaRef={textareaRef} segments={mention.overlaySegments} />
        )}
      </div>
    </div>
  );
}
