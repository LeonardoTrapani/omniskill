const DATABASE_URL =
  "postgresql://neondb_owner:npg_C9rdkYHOGz5M@ep-calm-mode-aei5hxk5-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

import { Client } from "pg";

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();
    const result = await client.query(`
      SELECT s.slug, sr.path, sr.id as resource_id
      FROM skill s
      JOIN skill_resource sr ON sr.skill_id = s.id
      WHERE s.visibility = 'public' AND s.owner_user_id IS NULL
      ORDER BY s.slug, sr.path;
    `);

    console.log(JSON.stringify(result.rows, null, 2));
  } finally {
    await client.end();
  }
}

main().catch(console.error);
