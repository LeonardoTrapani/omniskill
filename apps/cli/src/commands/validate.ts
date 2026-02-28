import * as ui from "../lib/ui";
import { formatValidationFailure, validateSkillFolder } from "../lib/validate-skill-folder";

export async function validateCommand() {
  const folder = process.argv[3];

  if (!folder) {
    ui.log.error("usage: better-skills validate <dir>");
    process.exit(1);
  }

  const result = await validateSkillFolder(folder);

  if (!result.ok || result.warnings.length > 0) {
    ui.log.error(formatValidationFailure(result));
    process.exit(1);
  }

  ui.log.success("validation passed");
  ui.log.info(`- resources: ${result.resourceCount}`);
  ui.log.info(`- resource mentions: ${result.mentionCount}`);
}
