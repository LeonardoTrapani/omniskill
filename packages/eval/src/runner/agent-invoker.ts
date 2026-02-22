import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { AgentResult } from "../types.js";

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

/**
 * Invokes an LLM agent to complete a coding task.
 * Uses regolo.ai with gpt-oss-120b via ai-sdk.
 */
export async function invokeAgent(
  prompt: string,
  workDir: string,
  timeoutMs: number,
): Promise<AgentResult> {
  const provider = getRegoloProvider();
  const startTime = Date.now();

  // Read any existing scaffold files to provide as context
  let scaffoldContext = "";
  try {
    const files = await collectFiles(workDir);
    if (files.length > 0) {
      scaffoldContext =
        "\n\n## Existing Project Files\n" +
        files.map(([path, content]) => `### ${path}\n\`\`\`\n${content}\n\`\`\``).join("\n\n");
    }
  } catch {
    // No scaffold files
  }

  // Read skill if present
  let skillContext = "";
  try {
    const skillDir = join(workDir, ".agents", "skills");
    const skillDirs = await readdir(skillDir);
    for (const slug of skillDirs) {
      const skillFile = join(skillDir, slug, "SKILL.md");
      try {
        const content = await Bun.file(skillFile).text();
        skillContext += `\n\n## Skill: ${slug}\n${content}`;
      } catch {
        // Skip
      }
    }
  } catch {
    // No skills
  }

  const systemPrompt = `You are an expert software engineer. Complete the task below by writing the required code.
${skillContext}

IMPORTANT: Respond ONLY with the files you create/modify in this exact format:
--- FILE: path/to/file.ts ---
\`\`\`
file content here
\`\`\`

Do not include explanations outside of file blocks. Only output the code files.`;

  const userPrompt = `${prompt}${scaffoldContext}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const result = await generateText({
      model: provider(REGOLO_MODEL),
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 4096,
      abortSignal: controller.signal,
    });

    clearTimeout(timeout);

    const wallTimeMs = Date.now() - startTime;
    const conversationLog = result.text;

    // Parse files from agent response
    const filesWritten = parseFilesFromResponse(conversationLog);

    // Write parsed files to workspace
    for (const [filePath, content] of Object.entries(filesWritten)) {
      await Bun.write(join(workDir, filePath), content);
    }

    return {
      completed: true,
      wallTimeMs,
      messageCount: 1,
      inputTokens: result.usage?.promptTokens ?? 0,
      outputTokens: result.usage?.completionTokens ?? 0,
      toolCallCount: 0,
      failedToolCallCount: 0,
      filesWritten,
      conversationLog,
      exitCode: 0,
    };
  } catch (e) {
    const wallTimeMs = Date.now() - startTime;
    return {
      completed: false,
      wallTimeMs,
      messageCount: 1,
      inputTokens: 0,
      outputTokens: 0,
      toolCallCount: 0,
      failedToolCallCount: 0,
      filesWritten: {},
      conversationLog: `Error: ${e instanceof Error ? e.message : String(e)}`,
      exitCode: 1,
    };
  }
}

/**
 * Parse files from the agent's response.
 * Expects format:
 *   --- FILE: path/to/file.ts ---
 *   ```
 *   content
 *   ```
 */
function parseFilesFromResponse(response: string): Record<string, string> {
  const files: Record<string, string> = {};
  const fileRegex = /---\s*FILE:\s*(.+?)\s*---\s*\n```[^\n]*\n([\s\S]*?)```/g;

  let match: RegExpExecArray | null;
  while ((match = fileRegex.exec(response)) !== null) {
    const path = match[1]!.trim();
    const content = match[2]!;
    files[path] = content;
  }

  // Fallback: try to find code blocks with file paths in comments
  if (Object.keys(files).length === 0) {
    const codeBlockRegex =
      /```(?:typescript|tsx?|javascript|jsx?)\s*\n\/\/\s*(.+?)\s*\n([\s\S]*?)```/g;
    while ((match = codeBlockRegex.exec(response)) !== null) {
      const path = match[1]!.trim();
      const content = match[2]!;
      if (path.includes(".") || path.includes("/")) {
        files[path] = content;
      }
    }
  }

  return files;
}

async function collectFiles(dir: string, prefix = ""): Promise<[string, string][]> {
  const results: [string, string][] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.name === "node_modules") continue;
      const fullPath = join(dir, entry.name);
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        const sub = await collectFiles(fullPath, relPath);
        results.push(...sub);
      } else {
        try {
          const content = await Bun.file(fullPath).text();
          results.push([relPath, content]);
        } catch {
          // Skip binary files
        }
      }
    }
  } catch {
    // Ignore read errors
  }
  return results;
}
