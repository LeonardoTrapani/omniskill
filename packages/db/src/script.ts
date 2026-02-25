import dotenv from "dotenv";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Carica .env dalla root del monorepo
dotenv.config({ path: join(import.meta.dir, "../../../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
export const db = drizzle(sql, { schema });
