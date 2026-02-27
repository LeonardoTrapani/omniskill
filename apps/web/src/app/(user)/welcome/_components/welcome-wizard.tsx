"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Copy, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dashboardRoute } from "@/lib/skills/routes";
import { markOnboardingDone } from "@/app/vault/_components/onboarding-gate";

/* ── Step persistence (localStorage only) ── */

const STEP_KEY = "better-skills:onboarding-step";
const TOTAL_STEPS = 3;

function readSavedStep(): number {
  if (typeof window === "undefined") return 1;
  const raw = localStorage.getItem(STEP_KEY);
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return parsed >= 1 && parsed <= TOTAL_STEPS ? parsed : 1;
}

function saveStep(step: number) {
  localStorage.setItem(STEP_KEY, String(step));
}

function clearStepStorage() {
  localStorage.removeItem(STEP_KEY);
}

/* ── Copyable command block ── */

function CommandBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group flex w-full items-center gap-3 border border-border bg-muted/20 px-4 py-3 text-left transition-colors hover:bg-muted/40"
    >
      <span className="text-primary/60 select-none">$</span>
      <code className="flex-1 truncate font-mono text-xs text-foreground">{command}</code>
      {copied ? (
        <Check className="size-3.5 shrink-0 text-primary" />
      ) : (
        <Copy className="size-3.5 shrink-0 text-muted-foreground opacity-40 transition-opacity group-hover:opacity-80" />
      )}
    </button>
  );
}

/* ── Step 1: Install CLI + Login ── */

function StepInstall() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Install the CLI and log in</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          The CLI is how you sync skills to your coding agents. Run these two commands in your
          terminal.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-muted-foreground">
            1. Install
          </p>
          <CommandBlock command="curl -fsSL https://better-skills.dev/install | bash" />
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-muted-foreground">
            2. Authenticate
          </p>
          <CommandBlock command="better-skills login" />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        This will open a browser window to authenticate. Once confirmed, your CLI session is saved
        locally.
      </p>
    </div>
  );
}

/* ── Step 2: Run Sync ── */

function StepSync() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Sync your skills</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          This downloads your vault to all configured agents. On first run it will ask which agents
          you use.
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-muted-foreground">
          Run sync
        </p>
        <CommandBlock command="better-skills sync" />
      </div>

      <div className="border border-border bg-muted/10 px-4 py-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-muted-foreground">
          What happens
        </p>
        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-1 inline-block size-1 shrink-0 bg-primary" />
            Checks authentication
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 inline-block size-1 shrink-0 bg-primary" />
            Downloads all skills from your vault
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 inline-block size-1 shrink-0 bg-primary" />
            Installs them to your selected agents
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ── Step 3: Create Skill Tutorial ── */

function StepCreateSkill() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Create your first skill</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Skills are reusable instructions your agents can access at runtime. Here is how to create
          one.
        </p>
      </div>

      <div className="space-y-4">
        <div className="border border-border bg-background">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-muted-foreground">
              From the web
            </p>
          </div>
          <div className="px-4 py-3">
            <ol className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="shrink-0 font-mono text-primary">01</span>
                Open your vault and click <span className="font-medium text-foreground">New Skill</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 font-mono text-primary">02</span>
                Write instructions in Markdown with a name and description
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 font-mono text-primary">03</span>
                Add resources (reference docs, scripts, configs)
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 font-mono text-primary">04</span>
                Run <code className="font-mono text-foreground">better-skills sync</code> to push it to your agents
              </li>
            </ol>
          </div>
        </div>

        <div className="border border-border bg-background">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-muted-foreground">
              From the CLI
            </p>
          </div>
          <div className="space-y-2 px-4 py-3">
            <CommandBlock command="better-skills create --from ./my-skill" />
            <p className="text-xs text-muted-foreground">
              Point it at a folder with a <code className="font-mono text-foreground">SKILL.md</code> file.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Stepper indicator ── */

function Stepper({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;

        return (
          <div key={step} className="flex items-center gap-2">
            <span
              className={`flex size-6 items-center justify-center border text-[10px] font-mono transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : isDone
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
              }`}
            >
              {isDone ? <Check className="size-3" /> : String(step).padStart(2, "0")}
            </span>
            {step < total && (
              <div
                className={`h-px w-6 transition-colors ${isDone ? "bg-primary/40" : "bg-border"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main wizard ── */

const STEP_LABELS = ["Install & Login", "Run Sync", "Create a Skill"];

export default function WelcomeWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setStep(readSavedStep());
    setMounted(true);
  }, []);

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS) {
      const next = step + 1;
      setStep(next);
      saveStep(next);
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 1) {
      const prev = step - 1;
      setStep(prev);
      saveStep(prev);
    }
  }, [step]);

  const finish = useCallback(() => {
    markOnboardingDone();
    clearStepStorage();
    router.replace(dashboardRoute);
  }, [router]);

  if (!mounted) return null;

  const isLast = step === TOTAL_STEPS;

  return (
    <main className="relative min-h-[calc(100vh-52px)] bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_72%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_72%,transparent)_1px,transparent_1px)] bg-[size:34px_34px] opacity-20" />

      <div className="relative mx-auto flex min-h-[calc(100vh-52px)] w-full max-w-2xl items-center px-4 py-10 sm:px-6">
        <div className="w-full space-y-8">
          {/* ── Header ── */}
          <header className="space-y-4">
            <p className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.08em] text-primary">
              <Terminal className="size-3.5" aria-hidden="true" />
              // Getting Started \\
            </p>
            <Stepper current={step} total={TOTAL_STEPS} />
            <p className="text-xs text-muted-foreground">
              Step {step} of {TOTAL_STEPS}
              <span className="mx-2 text-border">|</span>
              {STEP_LABELS[step - 1]}
            </p>
          </header>

          {/* ── Step content ── */}
          <div className="border border-border bg-background">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Terminal className="size-4 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-sm font-semibold uppercase font-mono text-foreground">
                  {STEP_LABELS[step - 1]}
                </h2>
              </div>
            </div>
            <div className="px-5 py-6">
              {step === 1 && <StepInstall />}
              {step === 2 && <StepSync />}
              {step === 3 && <StepCreateSkill />}
            </div>
          </div>

          {/* ── Navigation ── */}
          <div className="flex items-center justify-between">
            <div>
              {step > 1 ? (
                <Button variant="outline" size="sm" onClick={goBack} className="gap-2">
                  <ArrowLeft className="size-3.5" data-icon="inline-start" />
                  Back
                </Button>
              ) : (
                <div />
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={finish} className="text-muted-foreground">
                Skip for now
              </Button>
              {isLast ? (
                <Button size="sm" onClick={finish} className="gap-2">
                  Go to vault
                  <ArrowRight className="size-3.5" data-icon="inline-end" />
                </Button>
              ) : (
                <Button size="sm" onClick={goNext} className="gap-2">
                  I did it, continue
                  <ArrowRight className="size-3.5" data-icon="inline-end" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
