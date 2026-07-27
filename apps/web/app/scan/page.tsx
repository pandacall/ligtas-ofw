"use client";

import Link from "next/link";
import { useActionState } from "react";
import { scanPostAction, type ScanActionState } from "./actions";
import { ScanResultCard } from "./components/ScanResultCard";

export default function ScanPage() {
  const [state, formAction, isPending] = useActionState<ScanActionState, FormData>(scanPostAction, null);

  return (
    <main>
      <h1>LigtasOFW — Job-post scan</h1>
      <p>I-paste ang text ng job post para masuri ang mga red flag.</p>
      <form action={formAction}>
        <label htmlFor="text">Job post text</label>
        <textarea id="text" name="text" rows={10} required />
        <button type="submit" disabled={isPending}>
          {isPending ? "Sinusuri..." : "I-scan"}
        </button>
      </form>
      {state && <ScanResultCard result={state.result} syncedAt={state.syncedAt} />}
      <p>
        <Link href="/">Check agency instead</Link>
      </p>
    </main>
  );
}
