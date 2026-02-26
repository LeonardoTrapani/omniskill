import * as p from "@clack/prompts";

import { formatValidationFailure, validateSkillFolder } from "../lib/validate-skill-folder";

export async function validateCommand() {
  const folder = process.argv[3];

  if (!folder) {
    p.log.error("usage: better-skills validate <dir>");
    process.exit(1);
  }

  const result = await validateSkillFolder(folder);

  if (!result.ok) {
    p.log.error(formatValidationFailure(result));
    process.exit(1);
  }

  p.log.success("validation passed");
  p.log.info(`- resources: ${result.resourceCount}`);
  p.log.info(`- :new: mention paths: ${result.newMentionPathCount}`);

  for (const warning of result.warnings) {
    p.log.warn(`warning: ${warning}`);
  }
}
