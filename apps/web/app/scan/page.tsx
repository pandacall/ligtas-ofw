"use client";

import Link from "next/link";
import { useActionState } from "react";
import { scanPostAction, type ScanActionState } from "./actions";
import { ScanResultCard } from "./components/ScanResultCard";
import { MAX_IMAGE_BYTES, type ImageValidationError } from "../../lib/image-upload";

const MAX_IMAGE_MB = MAX_IMAGE_BYTES / (1024 * 1024);

const FILE_ERROR_COPY: Record<ImageValidationError, string> = {
  unsupported_type: "Hindi suportado ang file type na ito. Gumamit ng PNG, JPEG, o WebP na screenshot.",
  too_large: `Masyadong malaki ang file (max ${MAX_IMAGE_MB}MB).`,
};

export default function ScanPage() {
  const [state, formAction, isPending] = useActionState<ScanActionState, FormData>(scanPostAction, null);

  return (
    <main>
      <h1>LigtasOFW — Job-post scan</h1>
      <p>I-paste ang text ng job post, o mag-upload ng screenshot, para masuri ang mga red flag.</p>
      <form action={formAction}>
        <label htmlFor="text">Job post text</label>
        <textarea id="text" name="text" rows={10} />

        <label htmlFor="image">O, mag-upload ng screenshot</label>
        <input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp" />
        <p>Kung parehong nalagyan, ang na-upload na screenshot ang gagamitin.</p>

        <button type="submit" disabled={isPending}>
          {isPending ? "Sinusuri..." : "I-scan"}
        </button>
      </form>
      {state?.kind === "file_error" && <p role="alert">{FILE_ERROR_COPY[state.fileError]}</p>}
      {state?.kind === "scanned" && <ScanResultCard result={state.result} syncedAt={state.syncedAt} />}
      <p>
        <Link href="/">Check agency instead</Link>
      </p>
    </main>
  );
}
