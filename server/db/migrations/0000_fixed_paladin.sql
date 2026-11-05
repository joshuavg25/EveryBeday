CREATE TYPE "public"."access_type" AS ENUM('public', 'customers_only', 'paid');--> statement-breakpoint
CREATE TYPE "public"."bidet_type" AS ENUM('electronic_seat', 'hand_sprayer', 'both');--> statement-breakpoint
CREATE TYPE "public"."toilet_status" AS ENUM('pending', 'active', 'hidden');--> statement-breakpoint
CREATE TABLE "toilets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"location" geometry(point) NOT NULL,
	"address" text,
	"building_name" text,
	"floor" text,
	"access" "access_type" DEFAULT 'public' NOT NULL,
	"opening_hours" text,
	"is_24h" boolean DEFAULT false NOT NULL,
	"bidet_type" "bidet_type" NOT NULL,
	"wheelchair" boolean DEFAULT false NOT NULL,
	"status" "toilet_status" DEFAULT 'pending' NOT NULL,
	"confirm_count" integer DEFAULT 0 NOT NULL,
	"last_confirmed_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "toilets_location_gist" ON "toilets" USING gist ("location");