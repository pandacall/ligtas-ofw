// Mandatory footer (CLAUDE.md / verdict-cases.md): freshness line + official DMW verify
// link + hotline, required on every result. Snapshot-tested in ResultFooter.test.tsx.
import { formatDate } from "@ligtas-ofw/core/format";

export const DMW_VERIFY_URL = "https://dmw.gov.ph";
const DMW_HOTLINE = "1348";
const DMW_AIRT_HOTLINE = "(02) 8722-1144 / 8722-1155";
const IACAT_HOTLINE = "1343";

export function ResultFooter({
  dataAsOf,
  syncedAt,
  showReportBlock = false,
}: {
  dataAsOf: Date | null;
  syncedAt: Date;
  showReportBlock?: boolean;
}) {
  return (
    <footer>
      <p>
        {dataAsOf
          ? `DMW record as of ${formatDate(dataAsOf)}, last synced ${formatDate(syncedAt)}.`
          : `Last synced ${formatDate(syncedAt)}.`}{" "}
        Always verify on the{" "}
        <a href={DMW_VERIFY_URL} target="_blank" rel="noreferrer">
          official DMW website
        </a>
        .
      </p>
      <p>DMW Hotline: {DMW_HOTLINE}</p>
      {showReportBlock && (
        <div>
          <p>Paano mag-report:</p>
          <ul>
            <li>DMW Anti-Illegal Recruitment Branch: {DMW_AIRT_HOTLINE}</li>
            <li>IACAT 1343 Actionline (human trafficking): {IACAT_HOTLINE}</li>
          </ul>
        </div>
      )}
    </footer>
  );
}
