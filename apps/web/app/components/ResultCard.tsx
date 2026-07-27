import type { RegistryVerdictResult } from "@ligtas-ofw/core";
import { RegistryResultDetails } from "./RegistryResultDetails";
import { ResultFooter } from "./ResultFooter";

export function ResultCard({ result }: { result: RegistryVerdictResult }) {
  const showReportBlock = result.verdict === "HIGH_RISK";
  const dataAsOf = result.kind === "matched" ? result.agency.dataAsOf : null;

  return (
    <section>
      <RegistryResultDetails result={result} />
      <ResultFooter dataAsOf={dataAsOf} syncedAt={result.syncedAt} showReportBlock={showReportBlock} />
    </section>
  );
}
