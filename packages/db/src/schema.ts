/**
 * Registry schema: agencies, job orders, sync metadata. Field names mirror the real
 * DMW record shape captured in packages/sync/DATA-SOURCES.md so sync (#6) can insert
 * rows with minimal transformation.
 */
import { boolean, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const agencies = pgTable(
  "agencies",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    // Exact-normalized lookup key (ADR-0001) — see normalizeAgencyName. pg_trgm fuzzy
    // search (issue #4) will index this same column.
    normalizedName: text("normalized_name").notNull(),
    classification: text("classification"),
    licenseStatus: text("license_status").notNull(),
    licenseStatusDate: timestamp("license_status_date", { withTimezone: true }),
    licenseExpirationDate: timestamp("license_expiration_date", { withTimezone: true }),
    // Cross-check only — never the verdict source (CONTEXT.md, DATA-SOURCES.md).
    isValid: boolean("is_valid").notNull(),
    representative: text("representative"),
    address: text("address"),
    municipalityProvince: text("municipality_province"),
    cityProvince: text("city_province"),
    contactNumber: text("contact_number"),
    email: text("email"),
    // Per-record DMW freshness stamp — distinct from sync_metadata.last_synced_at.
    dataAsOf: timestamp("data_as_of", { withTimezone: true }).notNull(),
  },
  (table) => ({
    normalizedNameIdx: index("agencies_normalized_name_idx").on(table.normalizedName),
  }),
);
export type Agency = typeof agencies.$inferSelect;
export type NewAgency = typeof agencies.$inferInsert;

export const jobOrders = pgTable("job_orders", {
  id: serial("id").primaryKey(),
  // Joined to agencies by name string only — the DMW API has no id (ADR-0001).
  agencyName: text("agency_name").notNull(),
  principal: text("principal").notNull(),
  jobsite: text("jobsite").notNull(),
  position: text("position").notNull(),
  balance: integer("balance").notNull(),
  dateApproved: timestamp("date_approved", { withTimezone: true }),
  accreditationClass: text("accreditation_class"),
  dataAsOf: timestamp("data_as_of", { withTimezone: true }).notNull(),
});
export type JobOrder = typeof jobOrders.$inferSelect;
export type NewJobOrder = typeof jobOrders.$inferInsert;

export const syncMetadata = pgTable("sync_metadata", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(), // 'agencies' | 'job_orders'
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull(),
  rowCount: integer("row_count").notNull(),
  status: text("status").notNull(), // 'success' | 'failure'
});
export type SyncMetadataRow = typeof syncMetadata.$inferSelect;
export type NewSyncMetadataRow = typeof syncMetadata.$inferInsert;
