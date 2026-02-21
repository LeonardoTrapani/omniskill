"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle } from "lucide-react";
import { useChat } from "@ai-sdk/react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import type { SelectedSkill } from "../../_hooks/use-modal-machine";

interface ChatViewProps {
  mode: "customize" | "create";
  selectedSkill: SelectedSkill | null;
}

function getTextFromParts(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("");
}

export default function ChatView({ mode, selectedSkill }: ChatViewProps) {
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error } = useChat({
    transport: {
      sendMessages: async ({ messages: msgs }) => {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: msgs }),
        });
        if (!res.ok && !res.body) {
          throw new Error(`${res.status}: AI provider not configured yet`);
        }
        return res.body!.pipeThrough(new TextDecoderStream()) as unknown as ReadableStream;
      },
      reconnectToStream: async () => null,
    },
    messages:
      mode === "customize" && selectedSkill
        ? [
            {
              id: "init",
              role: "user" as const,
              parts: [
                {
                  type: "text" as const,
                  text: `I'd like to customize the skill "${selectedSkill.name}": ${selectedSkill.description}`,
                },
              ],
            },
          ]
        : undefined,
  });

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text?.trim()) return;
    sendMessage({ text: message.text });
    setInput("");
  };

  const is501 = error?.message?.includes("501") || error?.message?.includes("not configured");

  return (
    <div className="flex flex-col h-[60vh] font-[family-name:var(--font-chat)]">
      {/* Notice */}
      <div className="flex items-center gap-2 px-3 py-2 border border-border bg-secondary/50 text-xs text-muted-foreground mb-3">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        AI responses are not available yet. Connect a model provider to enable responses.
      </div>

      {/* Messages */}
      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="gap-4 p-0">
          {messages.length === 0 && (
            <ConversationEmptyState
              title={mode === "create" ? "Create a new skill" : "Customize skill"}
              description={
                mode === "create"
                  ? "Describe the skill you want to create..."
                  : "How would you like to customize this skill?"
              }
            />
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`px-3 py-2.5 text-sm ${
                message.role === "user"
                  ? "bg-primary/5 border border-primary/20 ml-8"
                  : "bg-secondary/50 border border-border mr-8"
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">
                {message.role === "user" ? "You" : "AI"}
              </span>
              <p className="text-foreground text-[13px] leading-relaxed whitespace-pre-wrap">
                {getTextFromParts(message.parts)}
              </p>
            </div>
          ))}

          {error && (
            <div className="px-3 py-2 text-xs text-muted-foreground border border-border bg-secondary/30 mr-8">
              {is501
                ? "AI provider not configured yet. Connect a model provider to enable responses."
                : `Error: ${error.message}`}
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Prompt Input */}
      <div className="mt-3 pt-3 border-t border-border">
        <PromptInput onSubmit={handleSubmit} className="border border-border">
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            placeholder={
              mode === "create"
                ? "Describe the skill you want to create..."
                : "How would you like to customize this skill?"
            }
            className="min-h-10 max-h-32 text-[13px]"
          />
          <PromptInputFooter>
            <div />
            <PromptInputSubmit status={status} disabled={!input.trim() && status !== "streaming"} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
