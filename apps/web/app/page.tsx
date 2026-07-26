import { checkAgency, loadFixtureRegistryState } from "@ligtas-ofw/core";
import { ResultCard } from "./components/ResultCard";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();

  return (
    <main>
      <h1>LigtasOFW</h1>
      <p>Check if a recruitment agency is DMW-licensed.</p>
      <form>
        <label htmlFor="q">Agency name</label>
        <input id="q" name="q" type="text" defaultValue={query ?? ""} required />
        <button type="submit">Check</button>
      </form>
      {query && <ResultCard result={checkAgency(query, loadFixtureRegistryState())} />}
    </main>
  );
}
