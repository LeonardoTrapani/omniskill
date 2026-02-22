import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { JudgeResult, LLMJudgeVerifier } from "../types.js";

const REGOLO_BASE_URL = "https://api.regolo.ai/v1";
const REGOLO_MODEL = "gpt-oss-120b";

function getRegoloProvider() {
  const apiKey = process.env.REGOLO_API_KEY;
  if (!apiKey) throw new Error("REGOLO_API_KEY environment variable is required");
  return createOpenAI({
    baseURL: REGOLO_BASE_URL,
    apiKey,
  });
}

export async function runLLMJudge(
  verifier: LLMJudgeVerifier,
  prompt: string,
  agentOutput: string,
  filesWritten: Record<string, string>,
): Promise<JudgeResult> {
  const provider = getRegoloProvider();

  const filesSummary = Object.entries(filesWritten)
    .map(([path, content]) => `--- ${path} ---\n${content}`)
    .join("\n\n");

  const dimensionsList = verifier.dimensions.map((d) => `"${d}"`).join(", ");

  try {
    const { text } = await generateText({
      model: provider(REGOLO_MODEL),
      prompt: `You are an expert code reviewer. Evaluate the AI agent's output below.

## Original Task
${prompt}

## Agent Output (Files Written)
${filesSummary || "No files were written."}

## Agent Conversation (truncated)
${agentOutput.slice(0, 3000)}

## Evaluation Rubric
${verifier.rubric}

## Instructions
Score each of these dimensions from 1 (poor) to 5 (excellent): ${dimensionsList}

You MUST respond with ONLY a JSON object in this exact format, no other text:
{
  "scores": { ${verifier.dimensions.map((d) => `"${d}": <1-5>`).join(", ")} },
  "reasoning": "<brief explanation>"
}`,
    });

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in judge response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      scores: Record<string, number>;
      reasoning: string;
    };

    const normalized: Record<string, number> = {};
    let sum = 0;
    let count = 0;

    for (const dim of verifier.dimensions) {
      const score = parsed.scores[dim];
      if (typeof score === "number" && score >= 1 && score <= 5) {
        const norm = (score - 1) / 4; // normalize 1-5 to 0-1
        normalized[dim] = norm;
        sum += norm;
        count++;
      } else {
        normalized[dim] = 0.5; // default to middle if missing
        sum += 0.5;
        count++;
      }
    }

    return {
      dimensions: normalized,
      composite: count > 0 ? sum / count : 0,
      reasoning: parsed.reasoning ?? "No reasoning provided",
    };
  } catch (e) {
    console.error("LLM Judge failed:", e instanceof Error ? e.message : String(e));
    const fallback: Record<string, number> = {};
    for (const d of verifier.dimensions) {
      fallback[d] = 0.5; // default to middle on failure
    }
    return {
      dimensions: fallback,
      composite: 0.5,
      reasoning: `Judge failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
