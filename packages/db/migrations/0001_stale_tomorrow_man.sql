CREATE TABLE "agencies_staging" (
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
CREATE TABLE "job_orders_staging" (
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
