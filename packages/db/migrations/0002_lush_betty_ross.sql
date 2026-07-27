CREATE TABLE "scan_quota_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "scan_quota_events_created_at_idx" ON "scan_quota_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "scan_quota_events_ip_created_at_idx" ON "scan_quota_events" USING btree ("ip","created_at");