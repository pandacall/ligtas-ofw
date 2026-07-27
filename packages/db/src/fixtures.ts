/**
 * Pure transforms from the hand-curated snapshot fixture (../fixtures/registry-snapshot.json)
 * into typed rows. Used by seed.ts (writes to Postgres) and, for this ticket, directly by
 * apps/web (in-memory registry state — no live DB provisioned yet, see issue #6/#12).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeAgencyName } from "./normalize";
import type { Agency, JobOrder } from "./schema";

const DEFAULT_SNAPSHOT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures/registry-snapshot.json",
);

export interface RawAgency {
  name: string;
  classification: string | null;
  license_status: string;
  license_status_date: string | null;
  license_expiration_date: string | null;
  is_valid: boolean;
  representative: string | null;
  address: string | null;
  municipality_province: string | null;
  city_province: string | null;
  contact_number: string | null;
  email: string | null;
  data_as_of: string;
}

export interface RawJobOrder {
  agency: string;
  principal: string;
  jobsite: string;
  position: string;
  balance: string;
  date_approved: string | null;
  accreditation_class: string | null;
  data_as_of: string;
}

export interface RegistrySnapshot {
  syncedAt: string;
  agencies: RawAgency[];
  jobOrders: RawJobOrder[];
}

export function loadRegistrySnapshot(filePath: string = DEFAULT_SNAPSHOT_PATH): RegistrySnapshot {
  const parsed = JSON.parse(readFileSync(filePath, "utf-8"));
  return { syncedAt: parsed.syncedAt, agencies: parsed.agencies, jobOrders: parsed.jobOrders };
}

// Synthetic sequential ids: the snapshot has no ids (matches the real DMW API), but
// Agency/JobOrder require one. A live sync (#6) replaces these with real serial ids.
export function toAgencyRows(snapshot: RegistrySnapshot): Agency[] {
  return snapshot.agencies.map((raw, index) => ({
    id: index + 1,
    name: raw.name,
    normalizedName: normalizeAgencyName(raw.name),
    classification: raw.classification,
    licenseStatus: raw.license_status,
    licenseStatusDate: raw.license_status_date ? new Date(raw.license_status_date) : null,
    licenseExpirationDate: raw.license_expiration_date ? new Date(raw.license_expiration_date) : null,
    isValid: raw.is_valid,
    representative: raw.representative,
    address: raw.address,
    municipalityProvince: raw.municipality_province,
    cityProvince: raw.city_province,
    contactNumber: raw.contact_number,
    email: raw.email,
    dataAsOf: new Date(raw.data_as_of),
  }));
}

export function toJobOrderRows(snapshot: RegistrySnapshot): JobOrder[] {
  return snapshot.jobOrders.map((raw, index) => ({
    id: index + 1,
    agencyName: raw.agency,
    principal: raw.principal,
    jobsite: raw.jobsite,
    position: raw.position,
    balance: Number.parseInt(raw.balance, 10),
    dateApproved: raw.date_approved ? new Date(raw.date_approved) : null,
    accreditationClass: raw.accreditation_class,
    dataAsOf: new Date(raw.data_as_of),
  }));
}
