CREATE TYPE "public"."view_mode" AS ENUM('basic', 'advanced');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "view_mode" "view_mode" DEFAULT 'basic' NOT NULL;--> statement-breakpoint
UPDATE "users" SET "view_mode" = 'advanced';
