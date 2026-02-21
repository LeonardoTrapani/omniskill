CREATE TYPE "public"."skill_resource_kind" AS ENUM('reference', 'script', 'asset', 'other');--> statement-breakpoint
CREATE TYPE "public"."skill_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" text,
	"visibility" "skill_visibility" DEFAULT 'public' NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"skill_markdown" text NOT NULL,
	"frontmatter" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_url" text,
	"source_identifier" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skill_visibility_owner_check" CHECK ("skill"."visibility" = 'public' or "skill"."owner_user_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "skill_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_skill_id" uuid NOT NULL,
	"target_skill_id" uuid,
	"target_resource_id" uuid,
	"kind" text DEFAULT 'related' NOT NULL,
	"note" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skill_link_target_check" CHECK (("skill_link"."target_skill_id" is not null and "skill_link"."target_resource_id" is null) or ("skill_link"."target_skill_id" is null and "skill_link"."target_resource_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "skill_resource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_id" uuid NOT NULL,
	"path" text NOT NULL,
	"kind" "skill_resource_kind" DEFAULT 'reference' NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill" ADD CONSTRAINT "skill_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_link" ADD CONSTRAINT "skill_link_source_skill_id_skill_id_fk" FOREIGN KEY ("source_skill_id") REFERENCES "public"."skill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_link" ADD CONSTRAINT "skill_link_target_skill_id_skill_id_fk" FOREIGN KEY ("target_skill_id") REFERENCES "public"."skill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_link" ADD CONSTRAINT "skill_link_target_resource_id_skill_resource_id_fk" FOREIGN KEY ("target_resource_id") REFERENCES "public"."skill_resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_link" ADD CONSTRAINT "skill_link_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_resource" ADD CONSTRAINT "skill_resource_skill_id_skill_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "skill_owner_user_id_idx" ON "skill" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "skill_visibility_idx" ON "skill" USING btree ("visibility");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_private_owner_slug_idx" ON "skill" USING btree ("owner_user_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_public_slug_idx" ON "skill" USING btree ("slug") WHERE "skill"."visibility" = 'public' and "skill"."owner_user_id" is null;--> statement-breakpoint
CREATE INDEX "skill_link_source_skill_id_idx" ON "skill_link" USING btree ("source_skill_id");--> statement-breakpoint
CREATE INDEX "skill_link_target_skill_id_idx" ON "skill_link" USING btree ("target_skill_id");--> statement-breakpoint
CREATE INDEX "skill_link_target_resource_id_idx" ON "skill_link" USING btree ("target_resource_id");--> statement-breakpoint
CREATE INDEX "skill_link_kind_idx" ON "skill_link" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "skill_resource_skill_id_idx" ON "skill_resource" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "skill_resource_kind_idx" ON "skill_resource" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_resource_skill_path_idx" ON "skill_resource" USING btree ("skill_id","path");