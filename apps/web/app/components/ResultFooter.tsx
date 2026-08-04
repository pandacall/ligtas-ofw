// Mandatory footer (CLAUDE.md / verdict-cases.md): freshness line + official DMW verify
// link + hotline, required on every result. Snapshot-tested in ResultFooter.test.tsx.
//
// Styled as the bottom matter of a record — mono, hairline-ruled, set apart from the card
// body. "Cache is the product": the freshness stamp is the load-bearing element here, not
// fine print, so it leads.
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
    <footer className="mt-4 border-t border-manila-rule/60 pt-3 font-mono text-[0.7rem] leading-relaxed text-manila-ink/80">
      <p>
        {dataAsOf
          ? `DMW record as of ${formatDate(dataAsOf)}, last synced ${formatDate(syncedAt)}.`
          : `Last synced ${formatDate(syncedAt)}.`}{" "}
        Always verify on the{" "}
        <a
          href={DMW_VERIFY_URL}
          target="_blank"
          rel="noreferrer"
          className="font-semibold underline decoration-manila-rule underline-offset-2 hover:text-narra"
        >
          official DMW website
        </a>
        .
      </p>
      <p className="mt-1">DMW Hotline: {DMW_HOTLINE}</p>
      {showReportBlock && (
        <div className="mt-3 border-t border-manila-rule/60 pt-3">
          <p className="font-semibold uppercase tracking-wider">Paano mag-report:</p>
          <ul className="mt-1 space-y-0.5">
            <li>DMW Anti-Illegal Recruitment Branch: {DMW_AIRT_HOTLINE}</li>
            <li>IACAT 1343 Actionline (human trafficking): {IACAT_HOTLINE}</li>
          </ul>
        </div>
      )}
    </footer>
  );
}
