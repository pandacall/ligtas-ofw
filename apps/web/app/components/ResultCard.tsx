import type { RegistryVerdictResult } from "@ligtas-ofw/core";
import { RegistryResultDetails } from "./RegistryResultDetails";
import { ResultFooter } from "./ResultFooter";
import { RecordCard } from "./RecordCard";

export function ResultCard({ result, query }: { result: RegistryVerdictResult; query?: string }) {
  const showReportBlock = result.verdict === "HIGH_RISK";
  const dataAsOf = result.kind === "matched" ? result.agency.dataAsOf : null;

  return (
    <RecordCard label="DMW Registry Check" reference={query}>
      <RegistryResultDetails result={result} />
      <ResultFooter dataAsOf={dataAsOf} syncedAt={result.syncedAt} showReportBlock={showReportBlock} />
    </RecordCard>
  );
}
