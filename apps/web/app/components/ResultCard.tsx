import type { RegistryVerdictResult } from "@ligtas-ofw/core";
import { RegistryResultDetails } from "./RegistryResultDetails";
import { ResultFooter } from "./ResultFooter";
import { TarpCard } from "./RecordCard";

export function ResultCard({ result, query }: { result: RegistryVerdictResult; query?: string }) {
  const showReportBlock = result.verdict === "HIGH_RISK";
  const dataAsOf = result.kind === "matched" ? result.agency.dataAsOf : null;

  return (
    <TarpCard label="DMW registry check" verdict={result.verdict}>
      <RegistryResultDetails result={result} />
      <ResultFooter dataAsOf={dataAsOf} syncedAt={result.syncedAt} showReportBlock={showReportBlock} />
    </TarpCard>
  );
}
