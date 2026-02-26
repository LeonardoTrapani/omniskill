ALTER TABLE "skill" DROP CONSTRAINT "skill_visibility_owner_check";--> statement-breakpoint
DROP INDEX "skill_visibility_idx";--> statement-breakpoint
DROP INDEX "skill_public_slug_idx";--> statement-breakpoint
DELETE FROM "skill" WHERE "owner_user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "skill" ALTER COLUMN "owner_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "skill" DROP COLUMN "visibility";--> statement-breakpoint
DROP TYPE "public"."skill_visibility";
