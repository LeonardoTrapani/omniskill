import * as p from "@clack/prompts";
import pc from "picocolors";

import { healthCommand } from "./commands/health";
import { loginCommand } from "./commands/login";
import { skillsListCommand } from "./commands/skills";
import { whoamiCommand } from "./commands/whoami";

async function main() {
  p.intro(pc.bgCyan(pc.black(" omniscient ")));

  const action = await p.select({
    message: "what would you like to do?",
    options: [
      { value: "health", label: "health check", hint: "ping the API server" },
      { value: "login", label: "login", hint: "browser sign-in for CLI" },
      { value: "whoami", label: "who am i", hint: "check current session" },
      { value: "skills", label: "list skills", hint: "browse public skills" },
    ],
  });

  if (p.isCancel(action)) {
    p.cancel("cancelled");
    process.exit(0);
  }

  switch (action) {
    case "health":
      await healthCommand();
      break;
    case "login":
      await loginCommand();
      break;
    case "whoami":
      await whoamiCommand();
      break;
    case "skills":
      await skillsListCommand();
      break;
  }

  p.outro(pc.dim("done"));
}

main();
