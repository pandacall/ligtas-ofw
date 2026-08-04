// Mandatory footer (CLAUDE.md / verdict-cases.md): freshness line + official DMW verify
// link + hotline, required on every result. Snapshot-tested in ResultFooter.test.tsx.
//
// "Cache is the product", so the freshness stamp leads rather than hiding in fine print.
//
// The hotlines are `tel:` links at full tap size. They were previously 0.7rem plain text at the
// bottom of a 2,000px card, on a card whose own copy says "i-report ito" — the 2026-08-04
// critique found zero tel: links in the entire product. Reporting is one of the two confirmed
// success definitions in PRODUCT.md; a number you cannot tap is not a route to it.
import { formatDate } from "@ligtas-ofw/core/format";
import { PhoneIcon } from "./Icon";

export const DMW_VERIFY_URL = "https://dmw.gov.ph";
const DMW_HOTLINE = "1348";
const DMW_AIRB_HOTLINE = "(02) 8722-1144 / 8722-1155";
const DMW_AIRB_TEL = "+63287221144";
const IACAT_HOTLINE = "1343";

function CallLink({ tel, label }: { tel: string; label: string }) {
  return (
    <a
      href={`tel:${tel}`}
      className="inline-flex min-h-[44px] items-center gap-2 border-2 border-ink bg-tarp px-3 font-bold text-ink transition-transform hover:-translate-y-px"
    >
      <PhoneIcon size={17} className="shrink-0" />
      <span>
        {label}
        <span className="sr-only"> — tumawag</span>
      </span>
    </a>
  );
}

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
    <footer className="mt-4 border-t-2 border-dashed border-paper-edge pt-3 text-[0.75rem] leading-relaxed text-ink-soft">
      <p>
        {dataAsOf
          ? `DMW record as of ${formatDate(dataAsOf)}, last synced ${formatDate(syncedAt)}.`
          : `Last synced ${formatDate(syncedAt)}.`}{" "}
        Always verify on the{" "}
        <a
          href={DMW_VERIFY_URL}
          target="_blank"
          rel="noreferrer"
          className="font-bold underline decoration-2 underline-offset-2 hover:text-risk"
        >
          official DMW website
        </a>
        .
      </p>
      <p className="mt-1.5">
        DMW Hotline:{" "}
        <a href={`tel:${DMW_HOTLINE}`} className="font-bold underline decoration-2 underline-offset-2">
          {DMW_HOTLINE}
        </a>
      </p>

      {/* A ruled section of the card, not another keylined box inside it. */}
      {showReportBlock && (
        <div className="mt-3 border-t-2 border-ink pt-3">
          <p className="text-[0.8rem] font-bold uppercase tracking-[0.08em] text-ink">Paano mag-report:</p>
          <ul className="mt-2 flex flex-col gap-2 text-[0.8rem] text-ink">
            <li>
              <CallLink tel={DMW_HOTLINE} label={`DMW Hotline ${DMW_HOTLINE}`} />
            </li>
            <li>
              <CallLink tel={DMW_AIRB_TEL} label="DMW Anti-Illegal Recruitment" />
              <span className="mt-1 block text-[0.72rem] text-ink-soft">{DMW_AIRB_HOTLINE}</span>
            </li>
            <li>
              <CallLink tel={IACAT_HOTLINE} label={`IACAT ${IACAT_HOTLINE} Actionline`} />
              <span className="mt-1 block text-[0.72rem] text-ink-soft">Para sa human trafficking</span>
            </li>
          </ul>
        </div>
      )}
    </footer>
  );
}
