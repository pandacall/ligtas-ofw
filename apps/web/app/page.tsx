import { Chat } from "./components/chat/Chat";
import { getRegistryState } from "../lib/registry-store";

// The chat is the whole Surface — the agency check and the job-post scan are things the
// conversation does, not separate pages to choose between (ADR-0005).
export default async function HomePage() {
  return <Chat syncedAt={await readSyncedAt()} />;
}

/**
 * The registry's freshness stamp, for the arrival tarp's lower matter.
 *
 * "Cache is the product" — the date the DMW copy was last synced is a first-class trust signal,
 * not a footnote. But it must never be able to take the homepage down: someone arriving
 * mid-panic from a shared link needs the input field far more than they need the date, so a
 * failed round-trip degrades to the tarp's generic line instead of an error page.
 */
async function readSyncedAt(): Promise<Date | undefined> {
  try {
    return (await getRegistryState()).syncedAt;
  } catch {
    return undefined;
  }
}
