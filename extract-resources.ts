#!/usr/bin/env bun
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./packages/db/src/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

async function main() {
  try {
    const rows = await db.execute(`
      SELECT s.slug, sr.path, sr.id as resource_id
      FROM skill s
      JOIN skill_resource sr ON sr.skill_id = s.id
      WHERE s.visibility = 'public' AND s.owner_user_id IS NULL
      ORDER BY s.slug, sr.path;
    `);

    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error("Query error:", err);
    process.exit(1);
  }
}

main();
