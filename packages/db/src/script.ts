import dotenv from "dotenv";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Carica .env dalla root del monorepo
dotenv.config({ path: join(import.meta.dir, "../../../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  prepare: false,
});
export const db = drizzle(sql, { schema });
