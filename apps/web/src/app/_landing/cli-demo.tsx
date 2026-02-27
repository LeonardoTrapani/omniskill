"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Box, Check, ChevronRight, Copy } from "lucide-react";
import type { Route } from "next";

import { SectionBackdrop } from "./grid-background";
import { Button } from "@/components/ui/button";
import { LandingContainer, SectionTailSpacer } from "./design-system";
import { authClient } from "@/lib/auth/auth-client";

const command = "npx -y better-skills-cli@latest init --all --browser";

function ClaudeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-white sm:size-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z"
      />
    </svg>
  );
}

function CursorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-white sm:size-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22.106 5.68L12.5.135a.998.998 0 00-.998 0L1.893 5.68a.84.84 0 00-.419.726v11.186c0 .3.16.577.42.727l9.607 5.547a.999.999 0 00.998 0l9.608-5.547a.84.84 0 00.42-.727V6.407a.84.84 0 00-.42-.726zm-.603 1.176L12.228 22.92c-.063.108-.228.064-.228-.061V12.34a.59.59 0 00-.295-.51l-9.11-5.26c-.107-.062-.063-.228.062-.228h18.55c.264 0 .428.286.296.514z"
      />
    </svg>
  );
}

function WindsurfIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-black sm:size-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M23.78 5.004h-.228a2.187 2.187 0 00-2.18 2.196v4.912c0 .98-.804 1.775-1.76 1.775a1.818 1.818 0 01-1.472-.773L13.168 5.95a2.197 2.197 0 00-1.81-.95c-1.134 0-2.154.972-2.154 2.173v4.94c0 .98-.797 1.775-1.76 1.775-.57 0-1.136-.289-1.472-.773L.408 5.098C.282 4.918 0 5.007 0 5.228v4.284c0 .216.066.426.188.604l5.475 7.889c.324.466.8.812 1.351.938 1.377.316 2.645-.754 2.645-2.117V11.89c0-.98.787-1.775 1.76-1.775h.002c.586 0 1.135.288 1.472.773l4.972 7.163a2.15 2.15 0 001.81.95c1.158 0 2.151-.973 2.151-2.173v-4.939c0-.98.787-1.775 1.76-1.775h.194c.122 0 .22-.1.22-.222V5.225a.221.221 0 00-.22-.222z"
      />
    </svg>
  );
}

function CodexIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-white sm:size-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.55 10.004a5.416 5.416 0 00-.478-4.501c-1.217-2.09-3.662-3.166-6.05-2.66A5.59 5.59 0 0010.831 1C8.39.995 6.224 2.546 5.473 4.838A5.553 5.553 0 001.76 7.496a5.487 5.487 0 00.691 6.5 5.416 5.416 0 00.477 4.502c1.217 2.09 3.662 3.165 6.05 2.66A5.586 5.586 0 0013.168 23c2.443.006 4.61-1.546 5.361-3.84a5.553 5.553 0 003.715-2.66 5.488 5.488 0 00-.693-6.497v.001zm-8.381 11.558a4.199 4.199 0 01-2.675-.954c.034-.018.093-.05.132-.074l4.44-2.53a.71.71 0 00.364-.623v-6.176l1.877 1.069c.02.01.033.029.036.05v5.115c-.003 2.274-1.87 4.118-4.174 4.123zM4.192 17.78a4.059 4.059 0 01-.498-2.763c.032.02.09.055.131.078l4.44 2.53c.225.13.504.13.73 0l5.42-3.088v2.138a.068.068 0 01-.027.057L9.9 19.288c-1.999 1.136-4.552.46-5.707-1.51h-.001zM3.023 8.216A4.15 4.15 0 015.198 6.41l-.002.151v5.06a.711.711 0 00.364.624l5.42 3.087-1.876 1.07a.067.067 0 01-.063.005l-4.489-2.559c-1.995-1.14-2.679-3.658-1.53-5.63h.001zm15.417 3.54l-5.42-3.088L14.896 7.6a.067.067 0 01.063-.006l4.489 2.557c1.998 1.14 2.683 3.662 1.529 5.633a4.163 4.163 0 01-2.174 1.807V12.38a.71.71 0 00-.363-.623zm1.867-2.773a6.04 6.04 0 00-.132-.078l-4.44-2.53a.731.731 0 00-.729 0l-5.42 3.088V7.325a.068.068 0 01.027-.057L14.1 4.713c2-1.137 4.555-.46 5.707 1.513.487.833.664 1.809.499 2.757h.001zm-11.741 3.81l-1.877-1.068a.065.065 0 01-.036-.051V6.559c.001-2.277 1.873-4.122 4.181-4.12.976 0 1.92.338 2.671.954-.034.018-.092.05-.131.073l-4.44 2.53a.71.71 0 00-.365.623l-.003 6.173v.002zm1.02-2.168L12 9.25l2.414 1.375v2.75L12 14.75l-2.415-1.375v-2.75z"
      />
    </svg>
  );
}

function GeminiIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 sm:size-5" aria-hidden="true">
      <defs>
        <linearGradient
          id="gemini-fill-0"
          x1="7"
          y1="15.5"
          x2="11"
          y2="12"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#08B962" />
          <stop offset="1" stopColor="#08B962" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="gemini-fill-1"
          x1="8"
          y1="5.5"
          x2="11.5"
          y2="11"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F94543" />
          <stop offset="1" stopColor="#F94543" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="gemini-fill-2"
          x1="3.5"
          y1="13.5"
          x2="17.5"
          y2="12"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FABC12" />
          <stop offset="0.46" stopColor="#FABC12" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        fill="#3186FF"
        d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
      />
      <path
        fill="url(#gemini-fill-0)"
        d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
      />
      <path
        fill="url(#gemini-fill-1)"
        d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
      />
      <path
        fill="url(#gemini-fill-2)"
        d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
      />
    </svg>
  );
}

const iconItems = [
  {
    id: "claude",
    label: "Claude Code",
    shellClass: "bg-[#D97757] text-white",
    icon: ClaudeIcon,
  },
  {
    id: "cursor",
    label: "Cursor",
    shellClass: "bg-black text-white",
    icon: CursorIcon,
  },
  {
    id: "windsurf",
    label: "Windsurf",
    shellClass: "bg-white text-black shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]",
    icon: WindsurfIcon,
  },
  {
    id: "codex",
    label: "Codex",
    shellClass: "bg-black text-white",
    icon: CodexIcon,
  },
  {
    id: "gemini",
    label: "Gemini CLI",
    shellClass: "bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]",
    icon: GeminiIcon,
  },
];

export default function CliDemo() {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data: session } = authClient.useSession();
  const ctaHref = (mounted && session ? "/vault" : "/login") as Route;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="docs" className="relative overflow-hidden">
      <SectionBackdrop variant="cli-demo" />

      <LandingContainer>
        <SectionTailSpacer />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="flex flex-col overflow-hidden border border-border/70 bg-background lg:flex-row"
        >
          <div className="flex flex-col justify-center gap-4 border-b border-border/70 px-8 py-10 lg:w-2/5 lg:border-r lg:border-b-0 lg:px-10 lg:py-12">
            <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground">
              // One Command Setup \\
            </p>

            <h3 className="text-3xl font-semibold tracking-tight text-foreground">
              Skills + <span className="text-primary">CLI</span>
            </h3>
            <p className="max-w-[350px] text-sm leading-[1.35] text-foreground/85">
              Give your AI agents web data with a single command.
            </p>

            <Button
              className="h-11 gap-2 border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:border-primary [a]:hover:bg-primary [a]:hover:text-background"
              render={<Link href={ctaHref} />}
            >
              {mounted && session ? "Go to Vault" : "Get Started"}
              <ArrowRight className="size-4" />
            </Button>
          </div>

          <div className="bg-muted/[0.25] lg:w-3/5">
            <div className="flex border-b border-border/70">
              <div className="flex w-auto items-center gap-2 border-r border-border/70 px-4 py-3 sm:gap-3 sm:px-5 sm:py-4">
                <span className="inline-block size-2 border border-border/80 bg-muted sm:size-2.5" />
                <span className="inline-block size-2 border border-border/80 bg-muted sm:size-2.5" />
                <span className="inline-block size-2 border border-border/80 bg-muted sm:size-2.5" />
              </div>
              <div className="px-5 py-3 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground sm:px-6 sm:py-4">
                Terminal
              </div>
            </div>

            <div className="flex min-h-[380px] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                {iconItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <span
                      key={item.id}
                      title={item.label}
                      className="inline-flex size-11 items-center justify-center border border-border/60 bg-background sm:size-12"
                    >
                      <span
                        className={`inline-flex size-6 items-center justify-center sm:size-7 ${item.shellClass}`}
                      >
                        <Icon />
                      </span>
                    </span>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="lg"
                onClick={handleCopy}
                className="group h-11 w-full max-w-[700px] justify-between gap-3 border-border/70 bg-background px-4 font-mono text-xs font-normal text-foreground sm:h-auto sm:px-6 sm:py-3 sm:text-sm"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span className="shrink-0 text-primary">$</span>
                  <span className="truncate">{command}</span>
                </span>
                <span className="inline-flex size-6 shrink-0 items-center justify-center border border-border/70 bg-background sm:size-7 cursor-pointer">
                  {copied ? (
                    <Check className="size-3 text-primary sm:size-4" />
                  ) : (
                    <Copy className="size-3 text-muted-foreground transition-colors group-hover:text-foreground sm:size-4" />
                  )}
                </span>
              </Button>

              <p className="max-w-sm font-mono text-xs leading-relaxed text-muted-foreground">
                Works with Claude Code, Cursor, Windsurf, Codex, Gemini CLI, and more
              </p>
            </div>
          </div>
        </motion.div>
        <SectionTailSpacer />
      </LandingContainer>
    </section>
  );
}
