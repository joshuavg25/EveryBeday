CREATE TYPE "public"."gender_type" AS ENUM('all', 'male', 'female', 'unisex');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('no_bidet', 'closed', 'wrong_location', 'spam', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'moderator', 'admin');--> statement-breakpoint
CREATE TABLE "confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"toilet_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"has_bidet" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"toilet_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" "report_reason" NOT NULL,
	"note" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"name" text,
	"email" text,
	"image" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"banned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "toilets" ADD COLUMN "gender" "gender_type" DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "toilets" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "toilets" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "confirmations" ADD CONSTRAINT "confirmations_toilet_id_toilets_id_fk" FOREIGN KEY ("toilet_id") REFERENCES "public"."toilets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirmations" ADD CONSTRAINT "confirmations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_toilet_id_toilets_id_fk" FOREIGN KEY ("toilet_id") REFERENCES "public"."toilets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "confirmations_toilet_idx" ON "confirmations" USING btree ("toilet_id","created_at");--> statement-breakpoint
CREATE INDEX "confirmations_user_idx" ON "confirmations" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "reports_user_idx" ON "reports" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_provider_account_unique" ON "users" USING btree ("provider","provider_account_id");--> statement-breakpoint
ALTER TABLE "toilets" ADD CONSTRAINT "toilets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "toilets_status_idx" ON "toilets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "toilets_created_by_idx" ON "toilets" USING btree ("created_by","created_at");