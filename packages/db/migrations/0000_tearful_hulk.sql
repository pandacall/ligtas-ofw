CREATE TABLE "agencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"classification" text,
	"license_status" text NOT NULL,
	"license_status_date" timestamp with time zone,
	"license_expiration_date" timestamp with time zone,
	"is_valid" boolean NOT NULL,
	"representative" text,
	"address" text,
	"municipality_province" text,
	"city_province" text,
	"contact_number" text,
	"email" text,
	"data_as_of" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"agency_name" text NOT NULL,
	"principal" text NOT NULL,
	"jobsite" text NOT NULL,
	"position" text NOT NULL,
	"balance" integer NOT NULL,
	"date_approved" timestamp with time zone,
	"accreditation_class" text,
	"data_as_of" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"last_synced_at" timestamp with time zone NOT NULL,
	"row_count" integer NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "agencies_normalized_name_idx" ON "agencies" USING btree ("normalized_name");