CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "skill_name_trgm_idx" ON "skill" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "skill_description_trgm_idx" ON "skill" USING gin ("description" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "skill_slug_trgm_idx" ON "skill" USING gin ("slug" gin_trgm_ops);