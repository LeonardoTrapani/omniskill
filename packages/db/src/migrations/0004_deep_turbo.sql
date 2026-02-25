ALTER TABLE "skill" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;

UPDATE "skill"
SET "is_default" = true
WHERE "owner_user_id" IS NOT NULL
  AND "visibility" = 'private'
  AND "slug" IN ('better-skills', 'omniskill');
