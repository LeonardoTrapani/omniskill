ALTER TABLE "skill_link" ALTER COLUMN "source_skill_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "skill_link" ADD COLUMN "source_resource_id" uuid;--> statement-breakpoint
ALTER TABLE "skill_link" ADD CONSTRAINT "skill_link_source_resource_id_skill_resource_id_fk" FOREIGN KEY ("source_resource_id") REFERENCES "public"."skill_resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skill_link_source_resource_id_idx" ON "skill_link" USING btree ("source_resource_id");--> statement-breakpoint
ALTER TABLE "skill_link" ADD CONSTRAINT "skill_link_source_check" CHECK (("skill_link"."source_skill_id" is not null and "skill_link"."source_resource_id" is null) or ("skill_link"."source_skill_id" is null and "skill_link"."source_resource_id" is not null));