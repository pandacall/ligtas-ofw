import { checkAgency, loadFixtureRegistryState } from "@ligtas-ofw/core";
import { ResultCard } from "./components/ResultCard";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; destination?: string; position?: string }>;
}) {
  const { q, destination, position } = await searchParams;
  const query = q?.trim();
  const claimedDestination = destination?.trim();
  const claimedPosition = position?.trim();
  const claim =
    claimedDestination && claimedPosition
      ? { destination: claimedDestination, position: claimedPosition }
      : undefined;

  return (
    <main>
      <h1>LigtasOFW</h1>
      <p>Check if a recruitment agency is DMW-licensed.</p>
      <form>
        <label htmlFor="q">Agency name</label>
        <input id="q" name="q" type="text" defaultValue={query ?? ""} required />
        <label htmlFor="destination">Claimed destination (optional)</label>
        <input id="destination" name="destination" type="text" defaultValue={claimedDestination ?? ""} />
        <label htmlFor="position">Claimed position (optional)</label>
        <input id="position" name="position" type="text" defaultValue={claimedPosition ?? ""} />
        <button type="submit">Check</button>
      </form>
      {query && <ResultCard result={checkAgency(query, loadFixtureRegistryState(), new Date(), claim)} />}
    </main>
  );
}
